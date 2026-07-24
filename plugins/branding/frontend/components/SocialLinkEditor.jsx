// SocialLinkEditor — editable list of social media links
// Each link has icon class, title, URL, sortOrder.

export default function SocialLinkEditor({ links: rawLinks, onChange }) {
  // Ensure all links have a stable ID (Finding #57)
  const links = (rawLinks || []).map(link => link.id ? link : { ...link, id: crypto.randomUUID() });

  const updateLink = (index, field, value) => {
    const updated = links.map((link, i) =>
      i === index ? { ...link, [field]: value } : link
    );
    onChange(updated);
  };

  const addLink = () => {
    const newLink = { id: crypto.randomUUID(), icon: "fa-brands fa-link", title: "", url: "", sortOrder: links.length };
    onChange([...links, newLink]);
  };

  const removeLink = (index) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const moveLink = (index, direction) => {
    const newLinks = [...links];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newLinks.length) return;
    [newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]];
    // Update sortOrder immutably (Finding #57 — avoid in-place mutation)
    const updated = newLinks.map((link, i) => ({ ...link, sortOrder: i }));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <div
          key={link.id}
          className="op-card bg-base-200 p-3 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            {/* Icon preview */}
            <div className="w-8 h-8 flex items-center justify-center text-lg text-base-content">
              <i className={link.icon || "fa-brands fa-link"} />
            </div>

            {/* Icon class input */}
            <div className="op-form-control flex-1">
              <input
                type="text"
                className="op-input op-input-bordered op-input-sm w-full"
                value={link.icon}
                onChange={(e) => updateLink(index, "icon", e.target.value)}
                placeholder="fa-brands fa-github"
              />
            </div>

            {/* Move up/down + delete */}
            <div className="flex gap-1">
              <button
                className="op-btn op-btn-ghost op-btn-xs"
                onClick={() => moveLink(index, -1)}
                disabled={index === 0}
                title="Move up"
              >
                <i className="fa-light fa-arrow-up" />
              </button>
              <button
                className="op-btn op-btn-ghost op-btn-xs"
                onClick={() => moveLink(index, 1)}
                disabled={index === links.length - 1}
                title="Move down"
              >
                <i className="fa-light fa-arrow-down" />
              </button>
              <button
                className="op-btn op-btn-ghost op-btn-xs text-error"
                onClick={() => removeLink(index)}
                title="Remove"
              >
                <i className="fa-light fa-trash" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              className="op-input op-input-bordered op-input-sm w-full"
              value={link.title}
              onChange={(e) => updateLink(index, "title", e.target.value)}
              placeholder="Title (e.g. GitHub)"
            />
            <input
              type="text"
              className="op-input op-input-bordered op-input-sm w-full"
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      ))}

      <button className="op-btn op-btn-outline op-btn-sm" onClick={addLink}>
        <i className="fa-light fa-plus mr-1" /> Add Link
      </button>
    </div>
  );
}
