import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useT } from "@/contexts/LanguageContext";

interface CommitmentModalProps {
  roleName: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const CommitmentModal = ({
  roleName,
  checked,
  onCheckedChange,
}: CommitmentModalProps) => {
  const t = useT();
  
  const getContent = () => {
    switch (roleName) {
      case "Pioneer": return t.commitment.pioneer;
      case "Ambassador": return t.commitment.ambassador;
      default: return t.commitment.default.replace("{role}", roleName);
    }
  };

  const content = getContent();

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/30 border border-border/50">
      <Checkbox
        id={`commitment-${roleName}`}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
      />
      <div className="space-y-1">
        <Label
          htmlFor={`commitment-${roleName}`}
          className="text-sm text-foreground leading-relaxed cursor-pointer"
        >
          {t.commitment.agreeCommitment.replace("{role}", roleName)}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  );
};

export default CommitmentModal;
