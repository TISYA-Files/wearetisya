import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSound } from "@/contexts/SoundContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useT } from "@/contexts/LanguageContext";

import pathfinderBg from "@/assets/role-pathfinder-v3.png";
import pioneerBg from "@/assets/role-operator-v3.png";
import partnerBg from "@/assets/role-partner-v3.png";
import internBg from "@/assets/role-intern-v3.png";
import ambassadorBg from "@/assets/role-ambassador-v3.png";

interface RoleSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPioneers: () => void;
  onSelectMembers: () => void;
  onSelectAmbassador: () => void;
  onSelectPartner: () => void;
}

interface Role {
  key: string;
  title: string;
  description: string;
  image: string;
  disabled?: boolean;
  onClick?: () => void;
  hoverSound?: () => void;
  subLabel?: string;
}

interface PanelProps {
  role: Role;
  index: number;
  total: number;
}

/* ---------- MOBILE CARD (vertical stack) ---------- */
const MobileRoleCard = ({ role, index }: { role: Role; index: number }) => {
  const { title, description, image, disabled, onClick, hoverSound, subLabel } = role;
  const t = useT();
  return (
    <motion.button
      type="button"
      onClick={!disabled ? onClick : undefined}
      onTouchStart={!disabled ? hoverSound : undefined}
      disabled={disabled}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.06 + index * 0.05,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      whileTap={!disabled ? { scale: 0.985 } : undefined}
      className={cn(
        "relative block w-full overflow-hidden rounded-xl text-left focus:outline-none",
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      )}
      style={{
        height: 132,
        border: "1px solid hsl(var(--foreground) / 0.14)",
        boxShadow: "0 6px 18px hsl(220 60% 3% / 0.55)",
      }}
    >
      {/* Background image */}
      <div
        className={cn(
          "absolute inset-0 bg-center bg-cover",
          disabled && "grayscale opacity-60"
        )}
        style={{ backgroundImage: `url(${image})` }}
      />
      {/* Dark gradient for readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, hsl(220 60% 3% / 0.55) 0%, hsl(220 60% 3% / 0.35) 45%, hsl(220 60% 3% / 0.92) 100%)",
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <h3
              className="font-extrabold uppercase tracking-[0.05em] leading-tight text-foreground"
              style={{
                fontSize: "18px",
                textShadow:
                  "0 0 12px hsl(var(--primary) / 0.55), 0 2px 8px hsl(220 60% 3% / 0.95)",
              }}
            >
              {title}
            </h3>
            {subLabel && (
              <div>
                <span
                  className="inline-block px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] rounded backdrop-blur-md"
                  style={{
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)",
                    color: "hsl(var(--foreground) / 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    textShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  {subLabel}
                </span>
              </div>
            )}
          </div>
          {disabled && (
            <span
              className="shrink-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] rounded"
              style={{
                background: "hsl(220 30% 6% / 0.85)",
                color: "hsl(var(--foreground) / 0.95)",
                border: "1px solid hsl(var(--foreground) / 0.35)",
              }}
            >
              {t.common.locked}
            </span>
          )}
        </div>

        <p
          className="font-medium leading-snug overflow-hidden"
          style={{
            fontSize: "13px",
            lineHeight: 1.45,
            color: "hsl(0 0% 100% / 0.94)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            textShadow: "0 1px 6px hsl(220 60% 3% / 0.98)",
          }}
        >
          {description}
        </p>
      </div>

      {/* Left accent border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background:
            "linear-gradient(180deg, transparent, hsl(var(--primary)), transparent)",
          boxShadow: "0 0 10px hsl(var(--primary) / 0.7)",
          opacity: disabled ? 0.35 : 0.9,
        }}
      />
    </motion.button>
  );
};

/* ---------- DESKTOP SLANTED PANEL ---------- */
const RolePanel = ({ role, index, total }: PanelProps) => {
  const isMobile = useIsMobile();
  const t = useT();
  const { title, description, image, disabled, onClick, hoverSound, subLabel } = role;

  const SLANT = isMobile ? 14 : 30;

  const zIndex = total - index;
  const clipPath =
    index === 0
      ? `polygon(0 0, calc(100% - ${SLANT}px) 0, 100% 100%, 0 100%)`
      : index === total - 1
        ? `polygon(0 0, 100% 0, 100% 100%, ${SLANT}px 100%)`
        : `polygon(0 0, calc(100% - ${SLANT}px) 0, 100% 100%, ${SLANT}px 100%)`;

  // Side padding to keep content clear of the slanted edges
  const padLeft = index === 0 ? (isMobile ? 12 : 24) : SLANT + (isMobile ? 12 : 24);
  const padRight = index === total - 1 ? (isMobile ? 12 : 24) : SLANT + (isMobile ? 12 : 24);

  return (
    <motion.button
      type="button"
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={!disabled ? hoverSound : undefined}
      disabled={disabled}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.08 + index * 0.06,
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      whileHover={!disabled && !isMobile ? { y: -6 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
      className={cn(
        "group relative block h-full text-left focus:outline-none overflow-hidden",
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      )}
      style={{
        zIndex,
        clipPath,
        width: index === 0 ? "100%" : `calc(100% + ${SLANT}px)`,
        marginLeft: index !== 0 ? `-${SLANT}px` : 0,
        boxShadow:
          "inset 1px 0 0 hsl(0 0% 100% / 0.18), inset -1px 0 0 hsl(0 0% 100% / 0.18)",
        willChange: "transform",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {/* Background image */}
        <div
          className={cn(
            "absolute inset-0 bg-center bg-cover transition-transform duration-700",
            !disabled && "group-hover:scale-[1.06]",
            disabled && "grayscale opacity-60"
          )}
          style={{ backgroundImage: `url(${image})` }}
        />

        {/* Gradient for legibility (top + bottom) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, hsl(220 60% 3% / 0.78) 0%, hsl(220 60% 3% / 0.15) 28%, hsl(220 60% 3% / 0.15) 55%, hsl(220 60% 3% / 0.92) 100%)",
          }}
        />

        {/* Hover sheen */}
        {!disabled && (
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                "linear-gradient(180deg, hsl(var(--primary) / 0.22) 0%, transparent 35%, transparent 65%, hsl(var(--primary) / 0.18) 100%)",
            }}
          />
        )}
      </div>

      {/* Content layer */}
      <div className="absolute inset-0 flex flex-col">
        {/* Title — top, centered horizontally */}
        <div
          className="pt-16 md:pt-24 text-center flex justify-center"
          style={{ paddingLeft: `${padLeft}px`, paddingRight: `${padRight}px` }}
        >
          <h3
            className="font-extrabold uppercase tracking-[0.06em] leading-[1.05] text-foreground text-center w-full"
            style={{
              fontSize: isMobile
                ? "clamp(0.6rem, 2.4vw, 0.85rem)"
                : "clamp(0.95rem, 1.5vw, 1.7rem)",
              textShadow:
                "0 0 14px hsl(var(--primary) / 0.7), 0 2px 10px hsl(220 60% 3% / 0.95)",
            }}
          >
            {title}
          </h3>
        </div>

        {/* Title underline */}
        <div
          className="text-center"
          style={{ paddingLeft: `${padLeft}px`, paddingRight: `${padRight}px` }}
        >
          <div
            className="mx-auto mt-2 h-[2px] w-8 md:w-16 rounded-full opacity-80"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)",
              boxShadow: "0 0 8px hsl(var(--primary) / 0.7)",
            }}
          />
        </div>

        {/* SubLabel / Badge */}
        {subLabel && (
          <div
            className="text-center mt-2.5 flex justify-center"
            style={{ paddingLeft: `${padLeft}px`, paddingRight: `${padRight}px` }}
          >
            <span
              className="inline-block px-3.5 py-1 text-[9px] md:text-[11px] font-extrabold uppercase tracking-[0.16em] rounded-full backdrop-blur-md transition-all duration-300 group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.02) 100%)",
                color: "hsl(var(--foreground) / 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                textShadow: "0 1px 4px rgba(0, 0, 0, 0.5)",
              }}
            >
              {subLabel}
            </span>
          </div>
        )}

        {/* Centered Locked badge for disabled roles */}
        {disabled && (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ paddingLeft: `${padLeft}px`, paddingRight: `${padRight}px` }}
          >
            <div
              className="px-2.5 py-1 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.25em] rounded-sm backdrop-blur-md"
              style={{
                background: "hsl(220 30% 6% / 0.82)",
                color: "hsl(var(--foreground) / 0.95)",
                border: "1px solid hsl(var(--foreground) / 0.35)",
              }}
            >
              {t.common.locked}
            </div>
          </div>
        )}

        {/* Spacer for non-disabled roles */}
        {!disabled && <div className="flex-1" />}

        {/* Description — bottom */}
        <div
          className="pb-6 md:pb-10 text-center"
          style={{ paddingLeft: `${padLeft}px`, paddingRight: `${padRight}px` }}
        >
          <p
            className="leading-snug font-medium"
            style={{
              fontSize: isMobile ? "9px" : "13px",
              color: "hsl(0 0% 100% / 0.96)",
              textShadow:
                "0 1px 6px hsl(220 60% 3% / 0.98), 0 0 14px hsl(220 60% 3% / 0.9)",
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </motion.button>
  );
};

const RoleSelection = ({
  isOpen,
  onClose,
  onSelectPioneers,
  onSelectMembers,
  onSelectAmbassador,
  onSelectPartner,
}: RoleSelectionProps) => {
  const isMobile = useIsMobile();
  const t = useT();
  const {
    playAmbientTone,
    playBack,
    playHover,
    playPathfinderSelect,
    playPioneerSelect,
    playPartnerSelect,
    playInternSelect,
  } = useSound();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      playAmbientTone();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, playAmbientTone]);

  const handleClose = () => {
    playBack();
    onClose();
  };

  const roles: Role[] = [
    {
      key: "pathfinder",
      title: t.roles.pathfinder.title,
      description: t.roles.pathfinder.description,
      image: pathfinderBg,
      onClick: () => {
        playPathfinderSelect();
        onSelectMembers();
      },
      hoverSound: playHover,
      subLabel: t.roles.pathfinder.subLabel,
    },
    {
      key: "pioneer",
      title: t.roles.pioneer.title,
      description: t.roles.pioneer.description,
      image: pioneerBg,
      onClick: () => {
        playPioneerSelect();
        onSelectPioneers();
      },
      hoverSound: playHover,
      subLabel: t.roles.pioneer.subLabel,
    },
    {
      key: "partner",
      title: t.roles.partner.title,
      description: t.roles.partner.description,
      image: partnerBg,
      onClick: () => {
        playPartnerSelect();
        onSelectPartner();
      },
      hoverSound: playHover,
    },
    {
      key: "intern",
      title: t.roles.intern.title,
      description: t.roles.intern.description,
      image: internBg,
      disabled: true,
      hoverSound: playInternSelect,
    },
    {
      key: "ambassador",
      title: t.roles.ambassador.title,
      description: t.roles.ambassador.description,
      image: ambassadorBg,
      onClick: () => {
        playHover();
        onSelectAmbassador();
      },
      hoverSound: playHover,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ isolation: "isolate" }}
        >
          {/* Blurred backdrop */}
          <motion.div
            className="fixed inset-0 z-[101]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              backgroundColor: "rgba(5, 10, 25, 0.7)",
            }}
          />

          {/* Content — fills entire screen */}
          <motion.div
            className="relative z-[102] flex flex-col w-full h-full"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            {/* Header bar */}
            <div
              className={cn(
                "z-[110] flex items-start justify-between px-4 md:px-8 pointer-events-none",
                isMobile
                  ? "relative pt-5 pb-5"
                  : "absolute top-0 inset-x-0 pt-4 md:pt-6"
              )}
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="pointer-events-auto"
              >
                <h2
                  className="font-extrabold uppercase tracking-[0.16em] md:tracking-[0.18em] text-foreground text-base md:text-2xl"
                  style={{
                    textShadow:
                      "0 0 14px hsl(var(--primary) / 0.55), 0 2px 10px hsl(220 60% 3% / 0.9)",
                  }}
                >
                  {t.roles.chooseYourPath}
                </h2>
                <motion.div
                  className="mt-2 h-[2px] w-[120px] md:w-[220px] rounded-full"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.25, duration: 0.55 }}
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(var(--primary)), transparent)",
                    boxShadow: "0 0 10px hsl(var(--primary) / 0.7)",
                  }}
                />
              </motion.div>

              <motion.button
                className="pointer-events-auto p-2.5 rounded-full bg-secondary/70 border border-white/10 text-foreground hover:bg-secondary hover:border-primary/40 transition-colors duration-150"
                onClick={handleClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Body */}
            {isMobile ? (
              <div className="relative flex-1 w-full overflow-y-auto px-4 pb-8 pt-1">
                <div className="flex flex-col gap-4">
                  {roles.map((role, i) => (
                    <MobileRoleCard key={role.key} role={role} index={i} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative flex-1 flex w-full h-full overflow-hidden">
                {roles.map((role, i) => (
                  <div
                    key={role.key}
                    className="relative h-full"
                    style={{ flex: "1 1 0%", minWidth: 0 }}
                  >
                    <RolePanel role={role} index={i} total={roles.length} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoleSelection;
