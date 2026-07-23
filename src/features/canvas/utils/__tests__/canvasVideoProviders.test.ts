import {
  parseCanvasVideoUrl,
} from "../canvasVideoProviders";

describe("Canvas video providers", () => {
  it.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "youtube",
      "dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    ],
    [
      "https://youtu.be/dQw4w9WgXcQ?t=10",
      "youtube",
      "dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    ],
    [
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "youtube",
      "dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    ],
    [
      "https://vimeo.com/76979871",
      "vimeo",
      "76979871",
      "https://player.vimeo.com/video/76979871?autoplay=1",
    ],
    [
      "https://player.vimeo.com/video/76979871",
      "vimeo",
      "76979871",
      "https://player.vimeo.com/video/76979871?autoplay=1",
    ],
  ])("parses an allowlisted URL", (url, provider, videoId, embedUrl) => {
    expect(parseCanvasVideoUrl(url)).toEqual(
      expect.objectContaining({ provider, videoId, embedUrl }),
    );
  });

  it.each([
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=too-short",
    "https://vimeo.com.evil.example/76979871",
    "https://vimeo.com/channels/staffpicks/76979871",
    "https://example.com/video/76979871",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
  ])("does not trust deceptive or unsupported URL %s", (url) => {
    expect(parseCanvasVideoUrl(url)).toBeNull();
  });

  it("uses restrictive provider policies and sends only the origin to YouTube", () => {
    const youtube = parseCanvasVideoUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    const vimeo = parseCanvasVideoUrl("https://vimeo.com/76979871");

    expect(youtube?.iframePolicy).toEqual({
      sandbox: "allow-scripts allow-same-origin allow-presentation",
      allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      referrerPolicy: "strict-origin-when-cross-origin",
    });
    expect(vimeo?.iframePolicy).toEqual({
      sandbox: "allow-scripts allow-same-origin allow-presentation",
      allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      referrerPolicy: "no-referrer",
    });
    expect(youtube?.iframePolicy.sandbox).not.toContain(
      "allow-top-navigation",
    );
    expect(youtube?.iframePolicy.allow).not.toContain("camera");
    expect(youtube?.iframePolicy.allow).not.toContain("microphone");
  });
});
