import React from "react";
import { BaseModal } from "./BaseModal";
import { useModalStore } from "../../stores/modalStore";
import { RELEASES, Release } from "../../data/releases";
import { ExternalLink } from "../Icons";

const CHANGELOG_URL = "https://scratchtabs.com/changelog.html";
const MAX_RELEASES_TO_SHOW = 10;

interface ReleaseBadgeProps {
  type: Release["type"];
}

const ReleaseBadge: React.FC<ReleaseBadgeProps> = ({ type }) => {
  const styles: Record<Release["type"], string> = {
    latest: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    release: "bg-secondary/10 text-secondary border-base",
    beta: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
    alpha: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  };

  const labels: Record<Release["type"], string> = {
    latest: "LATEST",
    release: "RELEASE",
    beta: "BETA",
    alpha: "ALPHA",
  };

  return (
    <span
      className={`px-1.5 py-0.5 text-[10px] font-mono uppercase rounded border ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
};

interface ReleaseEntryProps {
  release: Release;
  isFirst: boolean;
}

const ReleaseEntry: React.FC<ReleaseEntryProps> = ({ release, isFirst }) => {
  return (
    <div
      className={`relative pl-6 pb-6 ${
        isFirst ? "border-l-2 border-emerald-500" : "border-l border-base"
      }`}
    >
      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-0 w-3 h-3 rounded-full -translate-x-[7px] ${
          isFirst ? "bg-emerald-500" : "bg-element border-2 border-base"
        }`}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="font-mono font-semibold text-main">
          v{release.version}
        </span>
        <ReleaseBadge type={release.type} />
        <span className="text-xs text-secondary ml-auto">
          {formatDate(release.date)}
        </span>
      </div>

      {/* Headline */}
      <h4 className="text-sm font-medium text-main mb-1">{release.headline}</h4>

      {/* Summary (only for first release) or just summary text */}
      {isFirst ? (
        <div className="space-y-2">
          <p className="text-xs text-secondary">{release.summary}</p>
          {release.categories.length > 0 && (
            <div className="space-y-2 mt-3">
              {release.categories.map((category, idx) => (
                <div key={idx}>
                  <h5 className="text-xs font-medium text-secondary uppercase tracking-wider mb-1">
                    {category.name}
                  </h5>
                  <ul className="space-y-1">
                    {category.changes.slice(0, 3).map((change, changeIdx) => (
                      <li
                        key={changeIdx}
                        className="text-xs text-secondary flex items-start gap-1.5"
                      >
                        <span className="text-emerald-500 mt-0.5">+</span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: formatMarkdownBold(change),
                          }}
                        />
                      </li>
                    ))}
                    {category.changes.length > 3 && (
                      <li className="text-xs text-secondary italic">
                        ...and {category.changes.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-secondary">{release.summary}</p>
      )}
    </div>
  );
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMarkdownBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

export const ChangelogModal: React.FC = () => {
  const { isChangelogModalOpen, closeChangelogModal } = useModalStore();

  if (!isChangelogModalOpen) return null;

  const releasesToShow = RELEASES.slice(0, MAX_RELEASES_TO_SHOW);

  return (
    <BaseModal
      title="What's New"
      onClose={closeChangelogModal}
      maxWidthClass="max-w-lg"
      maxHeightClass="max-h-[80vh]"
    >
      <div className="p-6">
        {/* Timeline */}
        <div className="space-y-0">
          {releasesToShow.map((release, index) => (
            <ReleaseEntry
              key={release.version}
              release={release}
              isFirst={index === 0}
            />
          ))}
        </div>

        {/* Footer link */}
        <div className="mt-6 pt-4 border-t border-base">
          <a
            href={CHANGELOG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-secondary hover:text-main transition-colors"
          >
            <span>View Full History</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </BaseModal>
  );
};
