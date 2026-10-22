import {
  action,
  createMemo,
  createOptimistic,
  createSignal,
  Errored,
  Loading,
  onSettled,
  refresh,
} from "solid-js";
import { Icon } from "../../../components/solid/icon.tsx";
import type { BoardProvider } from "../../../lib/board/provider.ts";
import { t } from "../../../lib/reactive/i18n.ts";
import { projectSource } from "../../../lib/reactive/projection.ts";
import { showToast } from "../../../lib/toast.ts";

export type WidgetPinTarget = {
  board: BoardProvider;
  name: string;
  viewId: string;
  mcpApp: boolean;
};

export function WidgetPinButton(props: { target: WidgetPinTarget; title?: string }) {
  const ownerPinned = createMemo(() =>
    projectSource(props.target.board.snapshot$, {
      read: (snapshot) =>
        snapshot.value.widgets.some((widget) => widget.name === props.target.name),
      subscribe: (snapshot, notify) => snapshot.subscribe(notify),
      equality: Object.is,
    }),
  );
  const [pinned, setPinned] = createOptimistic(() => ownerPinned().read());
  const [saving, setSaving] = createOptimistic(false);
  const [receipt, setReceipt] = createSignal<Promise<void>>();
  const settled = createMemo(() => receipt());
  let admitted = false;
  let button!: HTMLButtonElement;
  const present = action(function* (completion: Promise<void>) {
    setSaving(true);
    setPinned(true);
    yield completion;
    yield refresh(pinned);
  });
  function PinFailure() {
    onSettled(() => {
      button.title = t("chat.toolCards.pinToDashboardFailed");
      if (button.isConnected) {
        showToast({ message: button.title });
      }
    });
    return null;
  }
  const label = () =>
    t(
      saving()
        ? "chat.toolCards.pinToDashboardPending"
        : pinned()
          ? "chat.toolCards.pinnedToDashboard"
          : "chat.toolCards.pinToDashboard",
    );
  return (
    <button
      ref={(element) => (button = element)}
      class="btn btn--ghost btn--icon chat-tool-card__widget-action"
      type="button"
      data-pin-widget
      disabled={saving() || pinned()}
      data-pinned={!saving() && pinned() ? "" : undefined}
      title={label()}
      aria-label={label()}
      onClick={() => {
        // Solid writes flush later; admission still prevents two same-task clicks.
        if (admitted || ownerPinned().read()) {
          return;
        }
        admitted = true;
        const target = props.target;
        const title = props.title?.trim();
        const identity = { name: target.name, ...(title ? { title } : {}) };
        const completion = target.mcpApp
          ? target.board.pinMcpApp({ ...identity, viewId: target.viewId })
          : target.board.pinWidget({ ...identity, docId: target.viewId });
        const result = present(completion);
        void setReceipt(result);
        void result.then(
          () => (admitted = false),
          () => (admitted = false),
        );
      }}
    >
      <Icon name="pin" />
      <Loading on={receipt()} fallback={null}>
        <Errored fallback={<PinFailure />}>{(settled(), null)}</Errored>
      </Loading>
    </button>
  );
}
