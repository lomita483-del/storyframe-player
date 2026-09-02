import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/watch/")({
  beforeLoad: () => {
    throw redirect({ to: "/search" });
  },
  head: () => ({
    meta: [
      { title: "Watch | Lumen Streaming" },
      {
        name: "description",
        content: "Pick a title from the Lumen catalog to start watching.",
      },
      { property: "og:title", content: "Watch | Lumen Streaming" },
      {
        property: "og:description",
        content: "Pick a title from the Lumen catalog to start watching.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
