import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StorageQuickPanel } from "../StorageQuickPanel";
import { formatBytes } from "../../../utils/formatBytes";
import {
    estimateTabStorageUsage,
    getStorageQuotaBytes,
    type TabStorageUsage,
} from "../../../services/tabStorageUsageService";

jest.mock("../../../services/tabStorageUsageService", () => ({
    estimateTabStorageUsage: jest.fn(),
    getStorageQuotaBytes: jest.fn().mockResolvedValue(null),
}));

jest.mock("../../../stores/rootStore", () => ({
    useRootStore: (selector: (s: { removeTab: jest.Mock }) => unknown) =>
        selector({ removeTab: mockRemoveTab }),
}));

const mockEstimate = estimateTabStorageUsage as jest.Mock;
const mockRemoveTab = jest.fn().mockResolvedValue(undefined);

const makeUsage = (overrides: Partial<TabStorageUsage>): TabStorageUsage => ({
    tabId: "tab-1",
    workspaceId: "ws-1",
    title: "Big tab",
    kind: "text",
    language: "plaintext",
    bytes: 2048,
    lineCount: 42,
    ...overrides,
});

describe("formatBytes", () => {
    it.each([
        [0, "0 B"],
        [512, "512 B"],
        [2048, "2 KB"],
        [5 * 1024 * 1024, "5 MB"],
        [1.5 * 1024 * 1024 * 1024, "1.5 GB"],
    ])("formats %i as %s", (bytes, expected) => {
        expect(formatBytes(bytes)).toBe(expected);
    });
});

describe("StorageQuickPanel", () => {
    const renderPanel = () =>
        render(
            <StorageQuickPanel
                onClose={jest.fn()}
                onNavigate={jest.fn().mockResolvedValue(undefined)}
                getWorkspaceName={() => "Scratch"}
            />,
        );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("lists heaviest tabs with size and content details", async () => {
        mockEstimate.mockResolvedValue([
            makeUsage({
                tabId: "tab-1",
                title: "Huge log",
                bytes: 3 * 1024 * 1024,
                lineCount: 120000,
            }),
            makeUsage({
                tabId: "tab-2",
                title: "Mood board",
                kind: "canvas",
                language: "plaintext",
                bytes: 900 * 1024,
                cardCount: 7,
                imageCount: 3,
            }),
        ]);

        renderPanel();

        await waitFor(() =>
            expect(screen.getByText("Huge log")).toBeInTheDocument(),
        );
        expect(screen.getByText("Mood board")).toBeInTheDocument();
        expect(screen.getAllByText(/Scratch/).length).toBeGreaterThan(0);
        expect(
            screen.getByTestId("storage-usage-row-tab-1"),
        ).toBeInTheDocument();
        expect(screen.getAllByTestId("storage-usage-refresh")).toHaveLength(1);
    });

    it("navigates when a row is clicked", async () => {
        mockEstimate.mockResolvedValue([makeUsage()]);
        const onNavigate = jest.fn().mockResolvedValue(undefined);
        render(
            <StorageQuickPanel
                onClose={jest.fn()}
                onNavigate={onNavigate}
                getWorkspaceName={() => "Scratch"}
            />,
        );

        await waitFor(() =>
            expect(screen.getByText("Big tab")).toBeInTheDocument(),
        );
        fireEvent.click(screen.getByText("Big tab"));

        expect(onNavigate).toHaveBeenCalledWith("tab-1", "ws-1");
    });

    it("confirms before closing a heavy tab and refreshes", async () => {
        mockEstimate
            .mockResolvedValueOnce([makeUsage({ bytes: 1024 })])
            .mockResolvedValueOnce([]);
        renderPanel();

        await waitFor(() =>
            expect(screen.getByText("Big tab")).toBeInTheDocument(),
        );
        fireEvent.click(screen.getByTestId("storage-usage-close-tab-1"));

        expect(mockRemoveTab).not.toHaveBeenCalled();
        expect(screen.getByTestId("confirmation-dialog")).toHaveTextContent(
            "Close \"Big tab\"",
        );
        fireEvent.click(screen.getByText("Close tab"));

        await waitFor(() => expect(mockRemoveTab).toHaveBeenCalledWith("tab-1"));
    });

    it("shows an empty state when there are no tabs", async () => {
        mockEstimate.mockResolvedValue([]);
        renderPanel();

        await waitFor(() =>
            expect(screen.getByText("No tabs to show")).toBeInTheDocument(),
        );
    });

    it("shows live app data and never surfaces browser-reported usage", async () => {
        mockEstimate.mockResolvedValue([
            makeUsage({ tabId: "tab-1", bytes: 1024 }),
            makeUsage({ tabId: "tab-2", bytes: 3072 }),
        ]);
        (getStorageQuotaBytes as jest.Mock).mockResolvedValueOnce(
            2 * 1024 ** 3,
        );
        renderPanel();

        await waitFor(() =>
            expect(
                screen.getAllByText("Big tab").length,
            ).toBeGreaterThan(0),
        );

        expect(screen.getByTestId("storage-usage-app-total")).toHaveTextContent(
            "4 KB",
        );
        const summary = screen.getByTestId("storage-usage-summary");
        expect(summary).not.toHaveTextContent("GB");
        expect(summary).not.toHaveTextContent("Browser");
    });

    it("shows the quota bar only once live data is a meaningful share of it", async () => {
        mockEstimate.mockResolvedValue([makeUsage({ bytes: 200 * 1024 ** 2 })]);
        (getStorageQuotaBytes as jest.Mock).mockResolvedValueOnce(
            2 * 1024 ** 3,
        );
        renderPanel();

        await waitFor(() =>
            expect(screen.getByText("Big tab")).toBeInTheDocument(),
        );
        expect(
            screen.getByTestId("storage-usage-quota-bar"),
        ).toBeInTheDocument();
    });

    it("hides the quota bar while live data is negligible", async () => {
        mockEstimate.mockResolvedValue([makeUsage({ bytes: 5 * 1024 })]);
        (getStorageQuotaBytes as jest.Mock).mockResolvedValueOnce(
            2 * 1024 ** 3,
        );
        renderPanel();

        await waitFor(() =>
            expect(screen.getByText("Big tab")).toBeInTheDocument(),
        );
        expect(
            screen.queryByTestId("storage-usage-quota-bar"),
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("storage-usage-app-total")).toHaveTextContent(
            "5 KB",
        );
    });

    it("still shows live app data when the browser estimate is unavailable", async () => {
        mockEstimate.mockResolvedValue([makeUsage({ bytes: 2048 })]);
        (getStorageQuotaBytes as jest.Mock).mockResolvedValueOnce(null);
        renderPanel();

        await waitFor(() =>
            expect(screen.getByText("Big tab")).toBeInTheDocument(),
        );

        expect(screen.getByTestId("storage-usage-app-total")).toHaveTextContent(
            "2 KB",
        );
        expect(
            screen.queryByTestId("storage-usage-quota-bar"),
        ).not.toBeInTheDocument();
    });
});
