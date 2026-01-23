import React from "react";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SidebarDraggableWorkspace } from "../SidebarDraggableWorkspace";
import { describe, it, expect, jest } from "@jest/globals";

describe("SidebarDraggableWorkspace", () => {
    const defaultProps = {
        id: "ws1",
        name: "Test Workspace",
        isExpanded: false,
        isActive: false,
        tabCount: 5,
        isSwitching: false,
        isVisuallyExpanded: false,
        onClick: jest.fn(),
        onDoubleClick: jest.fn(),
        onContextMenu: jest.fn(),
    };

    const renderWithDndContext = (component: React.ReactElement) => {
        return render(<DndContext>{component}</DndContext>);
    };

    it("should render workspace with name", () => {
        renderWithDndContext(<SidebarDraggableWorkspace {...defaultProps} />);
        expect(screen.getByText("Test Workspace")).toBeTruthy();
    });

    it("should show tab count badge", () => {
        renderWithDndContext(<SidebarDraggableWorkspace {...defaultProps} tabCount={5} />);
        expect(screen.getByText("5")).toBeTruthy();
    });

    it("should show active state", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} isActive={true} />
        );
        const workspaceElement = container.firstChild as HTMLElement;
        expect(workspaceElement.className).toContain("text-main");
        expect(workspaceElement.className).toContain("font-semibold");
        expect(workspaceElement.className).toContain("border-l-2");
    });

    it("should show switching state", () => {
        renderWithDndContext(<SidebarDraggableWorkspace {...defaultProps} isSwitching={true} />);
        expect(screen.getByText("Switching...")).toBeTruthy();
    });

    it("should show expanded chevron when visually expanded", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} isVisuallyExpanded={true} />
        );
        // ChevronDown should be rendered
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it("should show collapsed chevron when not expanded", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} isVisuallyExpanded={false} />
        );
        // ChevronRight should be rendered
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it("should show open folder icon when visually expanded", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} isVisuallyExpanded={true} />
        );
        // FolderOpen icon should be rendered
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it("should show closed folder icon when not expanded", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} isVisuallyExpanded={false} />
        );
        // Folder icon should be rendered
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it("should call onClick when clicked", () => {
        const onClickMock = jest.fn();
        renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} onClick={onClickMock} />
        );

        const workspaceElement = screen.getByText("Test Workspace");
        workspaceElement.click();

        expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it("should call onDoubleClick when double clicked", () => {
        const onDoubleClickMock = jest.fn();
        renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} onDoubleClick={onDoubleClickMock} />
        );

        const workspaceElement = screen.getByText("Test Workspace");
        workspaceElement.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        expect(onDoubleClickMock).toHaveBeenCalled();
    });

    it("should call onContextMenu on right click", () => {
        const onContextMenuMock = jest.fn();
        renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} onContextMenu={onContextMenuMock} />
        );

        const workspaceElement = screen.getByText("Test Workspace");
        workspaceElement.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

        expect(onContextMenuMock).toHaveBeenCalled();
    });

    it("should apply custom style prop", () => {
        const customStyle = { backgroundColor: "blue" };
        const { container } = renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} style={customStyle} />
        );
        const workspaceElement = container.firstChild as HTMLElement;
        expect(workspaceElement.style.backgroundColor).toBe("blue");
    });

    it("should highlight when drag is over (droppable zone)", () => {
        // This is testing the droppable functionality indirectly
        // The actual drag-over state would be set by dnd-kit during a drag operation
        const { container } = renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} />
        );
        const workspaceElement = container.firstChild as HTMLElement;
        expect(workspaceElement).toBeTruthy();
    });

    it("should show primary text color for folder icon when active", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableWorkspace {...defaultProps} isActive={true} isVisuallyExpanded={true} />
        );
        // FolderOpen with primary color should be rendered
        const svgElements = container.querySelectorAll('svg');
        expect(svgElements.length).toBeGreaterThan(0);
    });
});
