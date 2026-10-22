import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import { createControlUiE2eArtifactDir } from "../test-helpers/control-ui-e2e-artifacts.ts";
import { takeControlUiScreenshotFrame } from "../test-helpers/control-ui-e2e-screenshot.ts";
import { installMockGateway } from "../test-helpers/control-ui-e2e.ts";
import {
  configSnapshot,
  configSchema,
  objectSchema,
} from "./config-composer-fixtures.test-support.ts";
import {
  createControlUiE2eContextOptions,
  createControlUiE2eSuite,
} from "./control-ui-e2e-suite.test-support.ts";

const suite = createControlUiE2eSuite({ name: "Config map removal names" });

suite.define(() => {
  it("identifies each map removal by key and removes only the named entry", async () => {
    await suite.withPage(createControlUiE2eContextOptions(), async ({ page }) => {
      const config = {
        laboratory: {
          credentials: {
            ALPHA_SERVICE: "synthetic-alpha-value",
            BETA_SERVICE: "synthetic-beta-value",
          },
        },
      };
      const gateway = await installMockGateway(page, {
        methodResponses: {
          "config.get": configSnapshot(config, "map-removal-names", true),
          "config.schema": configSchema(
            objectSchema("", {
              laboratory: objectSchema("Laboratory", {
                credentials: {
                  type: "object",
                  title: "Service credentials",
                  additionalProperties: { type: "string" },
                },
              }),
            }),
            { "laboratory.credentials.*": { sensitive: true } },
          ),
        },
      });
      await page.goto(suite.server.baseUrl + "settings/advanced?section=laboratory");
      const section = page.locator("#config-section-laboratory");
      const map = section.locator(".cfg-map");
      await map.getByRole("textbox", { name: "Key: BETA_SERVICE", exact: true }).waitFor();
      const actions = map.getByRole("button", { name: /^Remove entry/ });
      await expect.poll(() => actions.count()).toBe(2);

      if (process.env.OPENCLAW_CAPTURE_UI_PROOF === "1") {
        const directory = createControlUiE2eArtifactDir("map-removal-names");
        await actions.last().focus();
        const frame = await takeControlUiScreenshotFrame(page, section, [map], {
          animations: "disabled",
          elements: [section],
        });
        await writeFile(path.join(directory, "map-removal-names.png"), frame.png);
        await writeFile(path.join(directory, "accessibility-tree.txt"), await map.ariaSnapshot());
      }
      const alpha = map.getByRole("button", {
        name: "Remove entry: ALPHA_SERVICE",
        exact: true,
      });
      const beta = map.getByRole("button", { name: "Remove entry: BETA_SERVICE", exact: true });
      expect(await alpha.count()).toBe(1);
      expect(await beta.count()).toBe(1);

      await beta.focus();
      await beta.press("Enter");
      await expect.poll(async () => (await gateway.getRequests("config.set")).length).toBe(1);
      const [request] = await gateway.getRequests("config.set");
      // SAFETY: config.set carries the serialized configuration in raw.
      expect(JSON.parse((request!.params as { raw: string }).raw)).toEqual({
        laboratory: { credentials: { ALPHA_SERVICE: "synthetic-alpha-value" } },
      });
      await expect.poll(() => beta.count()).toBe(0);
      await expect
        .poll(() => alpha.evaluate((element) => element === document.activeElement))
        .toBe(true);
      expect(
        await map.getByRole("textbox", { name: "Key: ALPHA_SERVICE", exact: true }).count(),
      ).toBe(1);
    });
  });
});
