import { Plugin, Notice, MarkdownView } from "obsidian";
type Coordinates = { x: number; y: number; getScroll: CallableFunction };
type MarkdownSubView = { contentContainerEl: HTMLElement };

export default class NinjaCursorPlugin extends Plugin {
	lastPos: Coordinates = { x: 0, y: 0, getScroll: () => 0 };
	cursorElement: HTMLSpanElement;
	events = ["keyup", "mouseup", "touchend"];

	async updateCursor() {
		const parentElement = (<MarkdownSubView>(
			(<unknown>(
				this.app?.workspace.getActiveViewOfType(MarkdownView)
					?.currentMode
			))
		))?.contentContainerEl?.parentElement;

		const selection = window.getSelection();
		if (!parentElement || !selection || !selection.focusNode) {
			return;
		}

		const focusNode = selection.focusNode;
		const cursorRange = document.createRange();
		if (selection.focusOffset === 0) {
			cursorRange.setStart(focusNode, 0);
			cursorRange.setEnd(focusNode, 1);
		} else {
			cursorRange.setStart(focusNode, selection.focusOffset - 1);
			cursorRange.setEnd(focusNode, selection.focusOffset);
		}

		const cursorDOMRects = cursorRange.getClientRects();
		//console.log(cursorDOMRects)
		const cursorDomRect = cursorDOMRects.item(cursorDOMRects.length - 1);

		if (!cursorDomRect) {
			new Notice("Could not find cursor position");
			return;
		}

		const lastClientX = this.lastPos.x;
		const lastClientY = this.lastPos.y - this.lastPos.getScroll();
		const currentClientX = selection.focusOffset
			? cursorDomRect.right
			: cursorDomRect.left;
		const currentClientY = cursorDomRect.y;
		if (lastClientX == currentClientX && lastClientY == currentClientY) {
			return;
		}

		const dx = currentClientX - lastClientX;
		const dy = lastClientY - currentClientY;
		const cursorTailAngle = Math.atan2(dx, dy) + Math.PI / 2;
		const cursorDragDistance = Math.sqrt(dx * dx + dy * dy);

		this.cursorElement.style.setProperty(
			"--cursor-drag-width",
			`${cursorDragDistance}px`
		);
		this.cursorElement.style.setProperty(
			"--cursor-drag-angle",
			`${cursorTailAngle}rad`
		);

		this.cursorElement.style.setProperty(
			"--cursor-height",
			`${cursorDomRect.height}px`
		);
		this.cursorElement.style.setProperty("--cursor-x1", `${lastClientX}px`);
		this.cursorElement.style.setProperty("--cursor-y1", `${lastClientY}px`);
		this.cursorElement.style.setProperty(
			"--cursor-x2",
			`${currentClientX}px`
		);
		this.cursorElement.style.setProperty(
			"--cursor-y2",
			`${currentClientY}px`
		);

		/* [SN-2022-08-14] Re-animate */
		this.cursorElement.style.animation = "none";
		/* [SN-2022-08-14] Force reflow */
		/* [SN-2022-08-14] REF https://stackoverflow.com/a/45036752/6604853 */
		this.cursorElement.offsetHeight;
		this.cursorElement.style.animation = "";

		this.lastPos.x = currentClientX;
		/* [SN-2022-08-14] Primitive would be passed by copy of value */
		this.lastPos.getScroll = () => parentElement?.scrollTop;
		this.lastPos.y = currentClientY + this.lastPos.getScroll();
	}

	async onload() {
		this.cursorElement = document.body.createSpan({
			cls: "dashing-cursor",
		});
		this.events.forEach((e: any) =>
			this.registerDomEvent(window, e, this.updateCursor.bind(this))
		);
	}

	onunload() {}
}
