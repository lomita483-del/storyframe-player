import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AccountPageShell } from "@/components/AccountPageShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/account/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Lumen" },
      { name: "description", content: "Tell the Lumen team about bugs, playback issues or title requests." },
      { property: "og:title", content: "Feedback — Lumen" },
      { property: "og:description", content: "Report issues or request titles on Lumen." },
    ],
  }),
  component: FeedbackPage,
});

const TOPICS = ["Playback issue", "Missing title", "Bug report", "Feature idea", "Something else"];

function FeedbackPage() {
  const [topic, setTopic] = useState(TOPICS[0]!);
  const [message, setMessage] = useState("");

  return (
    <AccountPageShell title="Feedback" description="We read everything — thanks for helping us improve.">
      <form
        className="space-y-5 rounded-2xl border border-border bg-surface/60 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!message.trim()) return;
          setMessage("");
          toast.success("Thanks! Your feedback has been noted.");
        }}
      >
        <div className="space-y-2">
          <Label>Topic</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOPICS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-message">Your message</Label>
          <Textarea
            id="feedback-message"
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe what happened, and which title it affected."
          />
        </div>

        <Button type="submit" className="rounded-full" disabled={!message.trim()}>
          Send feedback
        </Button>
      </form>
    </AccountPageShell>
  );
}
