/**
 * Makes the AI assistant panel collapsible.
 */
export function initAssistantToggle(): void {
  const panel = document.getElementById("assistant-panel");
  const toggleBtn = document.getElementById("assistant-toggle");
  const header = panel?.querySelector(".assistant-panel-header") as HTMLElement | null;

  if (!panel || !toggleBtn || !header) return;

  const toggle = () => {
    panel.classList.toggle("collapsed");
  };

  // Click header or button to toggle
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  header.addEventListener("click", toggle);
}

/**
 * Makes the table panel resizable and collapsible.
 */
export function initTableResize(): void {
  const tablePanel = document.getElementById("table-panel");
  const resizeHandle = document.getElementById("table-resize-handle");
  const toggleBtn = document.getElementById("table-toggle");

  if (!tablePanel || !resizeHandle || !toggleBtn) return;

  let isCollapsed = false;
  let savedHeight = 280;

  // --- Toggle collapse ---
  toggleBtn.addEventListener("click", () => {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      savedHeight = tablePanel.offsetHeight;
      tablePanel.style.height = "40px";
      tablePanel.classList.add("collapsed");
    } else {
      tablePanel.style.height = `${savedHeight}px`;
      tablePanel.classList.remove("collapsed");
    }
  });

  // --- Drag resize ---
  let startY = 0;
  let startHeight = 0;
  let isDragging = false;

  resizeHandle.addEventListener("mousedown", (e: MouseEvent) => {
    // Don't start drag on button click
    if ((e.target as HTMLElement).closest("button")) return;

    isDragging = true;
    startY = e.clientY;
    startHeight = tablePanel.offsetHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (!isDragging) return;
    const delta = startY - e.clientY;
    const newHeight = Math.max(100, Math.min(window.innerHeight * 0.6, startHeight + delta));
    tablePanel.style.height = `${newHeight}px`;

    if (isCollapsed) {
      isCollapsed = false;
      tablePanel.classList.remove("collapsed");
    }
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });
}
