function initialsFromAuthorName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatFeedTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return `Today · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * @param {{ announcement: { id: number, title: string, content: string, image_url?: string | null, tag?: string, created_at?: string, author?: { name?: string } } }} props
 */
export default function FeedAnnouncementPost({ announcement: ann }) {
  const authorName = ann.author?.name ?? 'CCS Staff';
  const tag = ann.tag || 'general';

  return (
    <article className="nf-post">
      <div className="nf-post__accent" aria-hidden />
      <div className="nf-post__inner">
        <div className="nf-post__meta">
          <div className="nf-post__avatar" aria-hidden>
            {initialsFromAuthorName(authorName)}
          </div>
          <div className="nf-post__who">
            <span className="nf-post__author">{authorName}</span>
            <span className="nf-post__time">{formatFeedTime(ann.created_at)}</span>
          </div>
        </div>
        <h3 className="nf-post__title">{ann.title}</h3>
        {ann.image_url ? (
          <div className="nf-post__media">
            <img src={ann.image_url} alt="" loading="lazy" />
          </div>
        ) : null}
        <p className="nf-post__body">{ann.content}</p>
        <div className="nf-post__footer">
          <span className={`nf-tag nf-tag--${tag === 'event' || tag === 'urgent' ? tag : 'general'}`}>{tag}</span>
        </div>
      </div>
    </article>
  );
}

export { formatFeedTime, initialsFromAuthorName };
