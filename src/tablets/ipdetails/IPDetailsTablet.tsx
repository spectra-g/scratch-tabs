import { useState, useEffect } from "react";
import { Tablet, TabletState } from "../types";
import { Globe2, Copy, RotateCw, Loader2, Check } from "lucide-react";

interface IPDetailsState extends TabletState {
  type: "ipdetails";
  data: {
    ip: string;
    details: any;
    loading: boolean;
    error: string | null;
    lastUpdated: number | null;
  };
}

// Separate React component for IP Details tablet UI
const IPDetailsTabletUI: React.FC<{
  state: IPDetailsState;
  onChange: (state: IPDetailsState) => void;
}> = ({ state, onChange }) => {
  const [isCopied, setIsCopied] = useState(false);

  const fetchIPDetails = async () => {
    onChange({
      ...state,
      data: {
        ...state.data,
        loading: true,
        error: null,
      },
    });

    try {
      // First get the IP address from ipify
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      const ip = ipData.ip;

      // Then get the details from ipapi.co
      const detailsResponse = await fetch(`https://ipapi.co/${ip}/json/`);
      const details = await detailsResponse.json();

      if (details.error) {
        throw new Error(details.reason || "Failed to fetch IP details");
      }

      onChange({
        ...state,
        data: {
          ip,
          details,
          loading: false,
          error: null,
          lastUpdated: Date.now(),
        },
      });
    } catch (error) {
      onChange({
        ...state,
        data: {
          ...state.data,
          loading: false,
          error: "Failed to fetch IP details. Please try again.",
        },
      });
    }
  };

  // Fetch IP details on initial load or if data is stale
  useEffect(() => {
    const shouldRefresh = !state.data.ip || // No data yet
      !state.data.lastUpdated || // No timestamp
      (Date.now() - state.data.lastUpdated > 60 * 60 * 1000); // Older than 1 hour

    if (shouldRefresh) {
      fetchIPDetails();
    }
  }, []);

  const copyIP = async () => {
    await navigator.clipboard.writeText(state.data.ip);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="h-full bg-canvas flex flex-col text-main">
      <div className="flex-none p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe2 className="text-muted" size={24} />
            <h2 className="text-xl font-semibold text-main">IP Details</h2>
          </div>
          <button
            onClick={fetchIPDetails}
            disabled={state.data.loading}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md transition-colors bg-element hover:bg-element-hover text-main disabled:bg-element disabled:text-muted disabled:hover:bg-element disabled:cursor-not-allowed"
          >
            {state.data.loading ? (
              <Loader2 size={16} className="animate-spin text-muted" />
            ) : (
              <RotateCw size={16} className="text-muted" />
            )}
            <span className="text-main">Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-y-auto custom-scrollbar">
        {state.data.error ? (
          <div className="bg-danger-subtle border border-danger/50 rounded-lg p-4 text-danger">
            {state.data.error}
          </div>
        ) : state.data.loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-muted" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* IP Address */}
            <div className="bg-surface-raised border border-base rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted">
                  IP Address
                </div>
                <button
                  onClick={copyIP}
                  className={`p-1 rounded transition-colors ${isCopied ? "text-success" : "text-muted hover:text-main"}`}
                  title={isCopied ? "Copied!" : "Copy IP to clipboard"}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="mt-1 text-2xl font-mono text-main">
                {state.data.ip}
              </div>
            </div>

            {/* Location Details */}
            <div className="bg-surface-raised border border-base rounded-lg divide-y divide-base">
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted mb-3">
                  Location
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted">City</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.city || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Region</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.region || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Country</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.country_name || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Postal Code</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.postal || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Network Details */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted mb-3">
                  Network
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted">ISP</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.org || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">ASN</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.asn || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Network</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.network || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Version</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.version || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Details */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted mb-3">Time</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted">Timezone</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.timezone || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">UTC Offset</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.utc_offset || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordinates */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-muted mb-3">
                  Coordinates
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted">Latitude</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.latitude || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Longitude</div>
                    <div className="text-sm text-secondary">
                      {state.data.details?.longitude || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {state.data.lastUpdated && (
              <div className="text-xs text-muted">
                Last updated:{" "}
                {new Date(state.data.lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const IPDetailsTablet: Tablet = {
  id: "ipdetails",
  label: "IP Details",
  keywords: ["ip", "address", "location", "network", "geolocation"],

  createInitialState(): IPDetailsState {
    return {
      type: "ipdetails",
      data: {
        ip: "",
        details: null,
        loading: false,
        error: null,
        lastUpdated: null,
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    return JSON.parse(json);
  },

  render(state: IPDetailsState, onChange) {
    return <IPDetailsTabletUI state={state} onChange={onChange} />;
  },
};
