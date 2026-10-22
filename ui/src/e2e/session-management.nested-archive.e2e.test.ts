import type { Page } from "playwright";
import { expect, it } from "vitest";
import { createControlUiSessionRow as sessionRow } from "../test-helpers/control-ui-session-fixtures.ts";
import * as ui from "./session-management.compact.test-support.ts";
import * as support from "./session-management.test-support.ts";

const suite = support.createSessionManagementE2eSuite();

const baseTime = Date.parse("2026-07-01T16:00:00.000Z");
const parentKey = "agent:main:flaky-connection";
const childKey = "agent:main:markdown-tooltip";
const siblingKey = "agent:main:archive-copy";
const otherKey = "agent:main:release-notes";

async function openNestedParent(page: Page, childCount: number) {
  const children = [childKey, siblingKey]
    .slice(0, childCount)
    .map((key, index) =>
      sessionRow(key, `Child ${index + 1}`, baseTime - 1_000, { spawnedBy: parentKey }),
    );
  const parent = sessionRow(parentKey, "Parent", baseTime, {
    childSessions: children.map((child) => child.key),
  });
  const other = sessionRow(otherKey, "Release notes draft", baseTime - 5_000);
  const gateway = await support.installMockGateway(page, {
    sessions: [parent, ...children, other],
    methodResponses: {
      "sessions.list": {
        cases: [
          { match: { spawnedBy: parentKey }, response: support.sessionsListResponse(children) },
          { response: support.sessionsListResponse([parent, other]) },
        ],
      },
    },
    sessionKey: otherKey,
  });
  await page.goto(support.controlUiSessionUrl(suite.server.baseUrl, otherKey));
  const parentRow = page.locator(`[data-session-key="${parentKey}"]`);
  await parentRow.waitFor({ state: "visible", timeout: 10_000 });
  const childRow = page.locator(`[data-session-key="${childKey}"]`);
  if (!(await childRow.isVisible())) {
    await parentRow.locator(".sidebar-child-session-toggle").click();
  }
  await childRow.waitFor({ state: "visible" });
  await parentRow.hover();
  await parentRow.locator("[data-sidebar-session-archive]").click();
  const modal = await support.waitForConfirmModal(page);
  await modal.getByText("Also archive nested sessions?", { exact: true }).waitFor();
  await modal
    .getByText(
      childCount === 1
        ? '"Parent" has 1 directly nested session. If you archive only this session, that nested session moves to the top level.'
        : '"Parent" has 2 directly nested sessions. If you archive only this session, those nested sessions move to the top level.',
      { exact: true },
    )
    .waitFor();
  return { gateway, modal };
}

type Gateway = Awaited<ReturnType<typeof support.installMockGateway>>;
async function archivedKeys(gateway: Gateway, methods = ["sessions.patch", "sessions.patchMany"]) {
  const requests = (await Promise.all(methods.map((method) => gateway.getRequests(method)))).flat();
  return requests.flatMap((request) => {
    const params = support.requireRecord(request.params);
    if (Array.isArray(params.targets)) {
      return params.targets.map((target) => String(support.requireRecord(target).key));
    }
    return params.archived === true ? [String(params.key)] : [];
  });
}

suite.define(() =>
  it.each([
    { action: "Archive only this session", childCount: 1, keys: [parentKey] },
    { action: "Archive all (2)", childCount: 1, keys: [childKey, parentKey] },
    { action: "Cancel", childCount: 1, keys: [] },
    {
      action: "Archive all (3)",
      childCount: 2,
      keys: [siblingKey, childKey, parentKey],
    },
  ])("nested archive dialog: $action ($childCount children)", ({ action, childCount, keys }) =>
    ui.withSessionPage(
      suite,
      async (page) => {
        const { gateway, modal } = await openNestedParent(page, childCount);
        await expect
          .poll(() =>
            ui.button(modal, "Cancel").evaluate((element) => element === document.activeElement),
          )
          .toBe(true);
        expect(
          await ui.button(modal, `Archive all (${childCount + 1})`).getAttribute("class"),
        ).toContain("primary");
        expect(
          await ui.button(modal, "Archive only this session").getAttribute("class"),
        ).not.toMatch(/primary|danger/u);
        const parentOnly = action === "Archive only this session";
        if (parentOnly) {
          await support.captureUiProof(suite, page, "nested-archive-dialog.png");
        }
        await ui.button(modal, action).click();
        if (action === "Cancel") {
          await modal.locator("dialog[open]").waitFor({ state: "detached" });
          expect(await archivedKeys(gateway)).toEqual(keys);
        } else if (parentOnly) {
          await expect.poll(() => archivedKeys(gateway)).toEqual(keys);
          await page.getByText("Session archived", { exact: true }).waitFor();
          await support.captureUiProof(suite, page, "nested-archive-this-session.png");
        } else {
          await expect.poll(() => ui.requestCount(gateway, "sessions.patchMany")).toBe(1);
          expect(await archivedKeys(gateway, ["sessions.patchMany"])).toEqual(keys);
        }
      },
      { colorScheme: "light", viewport: { height: 720, width: 1280 } },
    ),
  ),
);
