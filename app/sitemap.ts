import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://clearlot-hardware-hq.vercel.app";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/mcp`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/llms.txt`, changeFrequency: "weekly", priority: 0.5 },
  ];
}
