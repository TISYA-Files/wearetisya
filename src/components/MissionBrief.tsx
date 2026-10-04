import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import HeroButton from "./HeroButton";
import { ArrowLeft, ArrowRight, Shield, Zap, Star, Crosshair } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";
import { useT } from "@/contexts/LanguageContext";

type RolePath = "pioneers" | "members" | "ambassador" | "partner";

interface MissionBriefProps {
  role: RolePath;
  onAccept: () => void;
  onBack: () => void;
}



const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const MissionBrief = ({ role, onAccept, onBack }: MissionBriefProps) => {
  const { playPulse, playBack } = useSound();
  const t = useT();
  const data = t.mission[role];

  const handleAccept = () => {
    playPulse();
    onAccept();
  };

  const handleBack = () => {
    playBack();
    onBack();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <GlassCard
        className="max-w-xl w-full p-8 md:p-10"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Back button */}
        <motion.button
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 mb-6"
          onClick={handleBack}
          whileHover={{ x: -5 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.common.backToPaths}</span>
        </motion.button>

        {/* Header */}
        <motion.div
          className="mb-4"
          custom={0}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary/70 mb-2">
            {t.mission.pathSelected}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground glow-text">
            {data.title}
          </h2>
        </motion.div>

        {/* Tagline */}
        {'tagline' in data && (
          <motion.p
            className="mb-8 text-base md:text-lg font-semibold text-primary/90 tracking-wide"
            custom={0.5}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            {(data as { tagline: string }).tagline}
          </motion.p>
        )}

        {/* Mission */}
        <motion.div
          className="mb-6 p-4 rounded-lg bg-secondary/30 border border-border/50"
          custom={1}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t.mission.yourMission}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.mission}
          </p>
        </motion.div>

        {/* What You Do */}
        {'activities' in data && (
          <motion.div
            className="mb-6 p-4 rounded-lg bg-secondary/30 border border-border/50"
            custom={1.5}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 mb-3">
              <Crosshair className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {t.mission.whatYouDo}
              </span>
            </div>
            <ul className="space-y-2">
              {(data as { activities: readonly string[] }).activities.map((item: string, i: number) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* What You Unlock */}
        <motion.div
          className="mb-6 p-4 rounded-lg bg-secondary/30 border border-border/50"
          custom={2}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t.mission.whatYouUnlock}
            </span>
          </div>
          <ul className="space-y-2">
            {data.unlocks.map((item, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Your Impact */}
        <motion.div
          className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20"
          custom={3}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t.mission.yourImpact}
            </span>
          </div>
          <p className="text-sm text-foreground/80 italic leading-relaxed">
            {data.impact}
          </p>
        </motion.div>

        {/* Helper text above CTA */}
        <motion.p
          className="text-center text-xs text-muted-foreground/50 mb-3"
          custom={3.5}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          {t.mission.notSureHelper}
        </motion.p>

        {/* CTA */}
        <motion.div
          custom={4}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex justify-center"
        >
          <HeroButton onClick={handleAccept} size="lg">
            {t.common.acceptMission}
            <ArrowRight className="w-5 h-5" />
          </HeroButton>
        </motion.div>
      </GlassCard>
    </div>
  );
};

export default MissionBrief;
