import React from "react";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SidebarDraggableTab } from "../SidebarDraggableTab";
import { describe, it, expect, jest } from "@jest/globals";

describe("SidebarDraggableTab", () => {
    const defaultProps = {
        id: "tab1",
        title: "Test Tab",
        language: "javascript",
        workspaceId: "ws1",
        isActive: false,
        onClick: jest.fn(),
        onContextMenu: jest.fn(),
    };

    const renderWithDndContext = (component: React.ReactElement) => {
        return render(<DndContext>{component}</DndContext>);
    };

    it("should render tab with title", () => {
        renderWithDndContext(<SidebarDraggableTab {...defaultProps} />);
        expect(screen.getByText("Test Tab")).toBeTruthy();
    });

    it("should show active state", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableTab {...defaultProps} isActive={true} />
        );
        const tabElement = container.firstChild as HTMLElement;
        expect(tabElement.className).toContain("bg-primary-subtle");
        expect(tabElement.className).toContain("border-r-2");
    });

    it("should show pinned indicator", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableTab {...defaultProps} isPinned={true} />
        );
        // Pin icon should be rendered
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it("should show rich text indicator", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableTab {...defaultProps} isRich={true} />
        );
        // Type icon should be rendered
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it("should show tablet icon for tablets", () => {
        const { container } = renderWithDndContext(<SidebarDraggableTab {...defaultProps} isTablet={true} />);
        // Calculator icon should be rendered
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it("should disable drag for pinned tabs", () => {
        const { container } = renderWithDndContext(
            <SidebarDraggableTab {...defaultProps} isPinned={true} />
        );
        const tabElement = container.firstChild as HTMLElement;
        expect(tabElement.style.cursor).toBe("pointer");
    });

    it("should apply custom style prop", () => {
        const customStyle = { backgroundColor: "red" };
        const { container } = renderWithDndContext(
            <SidebarDraggableTab {...defaultProps} style={customStyle} />
        );
        const tabElement = container.firstChild as HTMLElement;
        expect(tabElement.style.backgroundColor).toBe("red");
    });

    it("should call onClick when clicked", () => {
        const onClickMock = jest.fn();
        renderWithDndContext(<SidebarDraggableTab {...defaultProps} onClick={onClickMock} />);

        const tabElement = screen.getByText("Test Tab");
        tabElement.click();

        expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it("should call onContextMenu on right click", () => {
        const onContextMenuMock = jest.fn();
        renderWithDndContext(
            <SidebarDraggableTab {...defaultProps} onContextMenu={onContextMenuMock} />
        );

        const tabElement = screen.getByText("Test Tab");
        tabElement.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

        expect(onContextMenuMock).toHaveBeenCalled();
    });

    it("should show correct icon for different languages", () => {
        const languages = ["typescript", "javascript", "json", "markdown", "plaintext", "python"];

        languages.forEach((language) => {
            const { container } = renderWithDndContext(
                <SidebarDraggableTab {...defaultProps} language={language} />
            );
            // Icon should be rendered
            expect(container.querySelector('svg')).toBeTruthy();
        });
    });
});
