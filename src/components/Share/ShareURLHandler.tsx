import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { shareService } from "../../services/shareService";

/**
 * Handler for share URLs (hash-based: #/s/v1/type/metadata/content)
 * Uses hash routing to ensure content never reaches server logs (privacy-focused)
 * Decompresses content and creates a new tab
 */
export const ShareURLHandler: React.FC = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (hasProcessed.current) {
      return;
    }

    const processShareUrl = async () => {
      // Check if there's a hash-based share URL
      const hash = window.location.hash;

      // Remove the leading # if present
      const hashPath = hash.startsWith('#') ? hash.substring(1) : hash;

      if (!hashPath || !hashPath.startsWith('/s/')) {
        return; // Not a share URL
      }

      hasProcessed.current = true;

      // Parse the share URL from hash
      const parsed = shareService.parseShareUrl(hashPath);

      if (!parsed) {
        // Clear invalid hash and navigate home
        window.location.hash = '';
        navigate("/", { replace: true });
        return;
      }

      try {
        // Decompress the content
        const decompressedContent = shareService.decompress(parsed.compressed);

        if (!decompressedContent) {
          window.location.hash = '';
          navigate("/", { replace: true });
          return;
        }

        // Apply format-specific trimming if metadata indicates it
        const finalContent = shareService.applyFormatTrim(
          parsed.type,
          decompressedContent,
          parsed.metadata
        );

        // Clear the hash (removes content from URL)
        window.location.hash = '';

        // Navigate to MainLayout with content in state
        const pendingShare = {
          title: `Shared ${parsed.type}`,
          content: finalContent,
          language: parsed.type,
          languageLocked: true
        };

        navigate("/", {
          replace: true,
          state: {
            pendingShare
          }
        });
      } catch (error) {
        console.error("Error processing share URL:", error);
        window.location.hash = '';
        navigate("/", { replace: true });
      }
    };

    processShareUrl();
  }, [navigate]);

  return null; // No UI needed, just processes hash on mount
};
