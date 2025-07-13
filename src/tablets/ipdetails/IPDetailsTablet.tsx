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

  // Fetch IP details on initial load
  useEffect(() => {
    if (!state.data.ip) {
      fetchIPDetails();
    }
  }, []);

  const copyIP = async () => {
    await navigator.clipboard.writeText(state.data.ip);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      <div className="flex-none p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe2 className="text-gray-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-100">IP Details</h2>
          </div>
          <button
            onClick={fetchIPDetails}
            disabled={state.data.loading}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
          >
            {state.data.loading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : (
              <RotateCw size={16} className="text-gray-400" />
            )}
            <span className="text-gray-200">Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 overflow-y-auto custom-scrollbar">
        {state.data.error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            {state.data.error}
          </div>
        ) : state.data.loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* IP Address */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">
                  IP Address
                </div>
                <button
                  onClick={copyIP}
                  className={`p-1 rounded transition-colors ${isCopied ? "text-green-400" : "text-gray-400 hover:text-gray-300"}`}
                  title={isCopied ? "Copied!" : "Copy IP to clipboard"}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="mt-1 text-2xl font-mono text-gray-100">
                {state.data.ip}
              </div>
            </div>

            {/* Location Details */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg divide-y divide-gray-700/50">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Location
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">City</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.city || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Region</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.region || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Country</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.country_name || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Postal Code</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.postal || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Network Details */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Network
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">ISP</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.org || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">ASN</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.asn || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Network</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.network || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Version</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.version || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Details */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Time</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Timezone</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.timezone || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">UTC Offset</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.utc_offset || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordinates */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Coordinates
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Latitude</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.latitude || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Longitude</div>
                    <div className="text-sm text-gray-200">
                      {state.data.details?.longitude || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {state.data.lastUpdated && (
              <div className="text-xs text-gray-500">
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
