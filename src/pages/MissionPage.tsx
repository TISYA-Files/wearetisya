import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import MissionBrief from "@/components/MissionBrief";
import SEO from "@/components/SEO";

const MISSION_META: Record<string, { title: string; description: string }> = {
  pioneers: { title: "Pioneer Mission Brief — TİSYA", description: "Read the Pioneer (Volunteer) briefing and apply to contribute your skills to the TİSYA Alliance." },
  members: { title: "Pathfinder Mission Brief — TİSYA", description: "Read the Pathfinder (Member) briefing and join the core of the TİSYA Alliance." },
  ambassador: { title: "Ambassador Mission Brief — TİSYA", description: "Lead TİSYA presence in your country, campus, or community. Read the Ambassador briefing." },
  partner: { title: "Partner & Sponsor Brief — TİSYA", description: "Partner with or sponsor TİSYA. Read the briefing for organizations." },
};

type MissionRole = "pioneers" | "members" | "ambassador" | "partner";

const isMissionRole = (v: string | undefined): v is MissionRole =>
  v === "pioneers" || v === "members" || v === "ambassador" || v === "partner";

const MissionPage = () => {
  const navigate = useNavigate();
  const { role } = useParams<{ role: string }>();

  if (!isMissionRole(role)) {
    navigate("/", { replace: true });
    return null;
  }

  const meta = MISSION_META[role];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      <SEO title={meta.title} description={meta.description} path={`/mission/${role}`} type="article" />
      <MissionBrief
        role={role}
        onAccept={() => navigate(`/join/${role}`)}
        onBack={() => navigate("/")}
      />
    </motion.div>
  );
};

export default MissionPage;
