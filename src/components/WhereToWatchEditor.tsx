import { Plus, Trash2 } from "lucide-react";
import { WATCH_SERVICES, type WhereToWatchLink } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  links: WhereToWatchLink[];
  onChange: (links: WhereToWatchLink[]) => void;
};

/** Editor for official "where to watch" deep links shown on the movie page. */
export function WhereToWatchEditor({ links, onChange }: Props) {
  const update = (index: number, patch: Partial<WhereToWatchLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  return (
    <div className="space-y-3">
      {links.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No services linked yet. Add the official platforms where this title streams.
        </p>
      )}

      {links.map((link, index) => (
        <div key={index} className="flex flex-col gap-2 sm:flex-row">
          <Select value={link.name} onValueChange={(value) => update(index, { name: value })}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              {WATCH_SERVICES.map((service) => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={link.url}
            onChange={(event) => update(index, { url: event.target.value })}
            placeholder="https://www.netflix.com/title/80100172"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove service"
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="rounded-full"
        onClick={() => onChange([...links, { name: "", url: "" }])}
      >
        <Plus className="size-3.5" /> Add service
      </Button>
    </div>
  );
}
