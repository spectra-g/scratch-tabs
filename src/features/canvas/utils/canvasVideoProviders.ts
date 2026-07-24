import type { ReferrerPolicy } from "react";
import type { CanvasVideoProvider } from "../types";

const SHARED_IFRAME_POLICY = {
  sandbox: "allow-scripts allow-same-origin allow-presentation",
  allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
} as const;

export interface CanvasVideoIframePolicy {
  sandbox: string;
  allow: string;
  referrerPolicy: ReferrerPolicy;
}

export interface CanvasVideoMatch {
  provider: CanvasVideoProvider;
  providerLabel: string;
  videoId: string;
  embedUrl: string;
  iframePolicy: CanvasVideoIframePolicy;
}

interface CanvasVideoProviderDefinition {
  provider: CanvasVideoProvider;
  label: string;
  parseId: (url: URL) => string | null;
  createEmbedUrl: (videoId: string) => string;
  iframePolicy: CanvasVideoIframePolicy;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;

const exactHost = (hostname: string, allowed: readonly string[]): boolean =>
  allowed.includes(hostname.toLowerCase());

const parseYouTubeId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase();
  let candidate: string | null = null;

  if (exactHost(host, ["youtu.be"])) {
    candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (
    exactHost(host, ["youtube.com", "www.youtube.com", "m.youtube.com"])
  ) {
    const segments = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/watch") candidate = url.searchParams.get("v");
    else if (["embed", "shorts", "live"].includes(segments[0])) {
      candidate = segments[1] ?? null;
    }
  }

  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
};

const parseVimeoId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  let candidate: string | null = null;

  if (exactHost(host, ["vimeo.com", "www.vimeo.com"])) {
    candidate = segments[0] ?? null;
  } else if (exactHost(host, ["player.vimeo.com"]) && segments[0] === "video") {
    candidate = segments[1] ?? null;
  }

  return candidate && VIMEO_ID.test(candidate) ? candidate : null;
};

const PROVIDERS: readonly CanvasVideoProviderDefinition[] = [
  {
    provider: "youtube",
    label: "YouTube",
    parseId: parseYouTubeId,
    createEmbedUrl: (videoId) =>
      `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`,
    iframePolicy: {
      ...SHARED_IFRAME_POLICY,
      referrerPolicy: "strict-origin-when-cross-origin",
    },
  },
  {
    provider: "vimeo",
    label: "Vimeo",
    parseId: parseVimeoId,
    createEmbedUrl: (videoId) =>
      `https://player.vimeo.com/video/${videoId}?autoplay=1`,
    iframePolicy: {
      ...SHARED_IFRAME_POLICY,
      referrerPolicy: "no-referrer",
    },
  },
];

export const parseCanvasVideoUrl = (
  canonicalUrl: string,
): CanvasVideoMatch | null => {
  let url: URL;
  try {
    url = new URL(canonicalUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  for (const definition of PROVIDERS) {
    const videoId = definition.parseId(url);
    if (videoId) {
      return {
        provider: definition.provider,
        providerLabel: definition.label,
        videoId,
        embedUrl: definition.createEmbedUrl(videoId),
        iframePolicy: definition.iframePolicy,
      };
    }
  }
  return null;
};
