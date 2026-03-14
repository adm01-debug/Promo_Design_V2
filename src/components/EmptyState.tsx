import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, actionPath }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4 text-center"
  >
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5"
    >
      <Icon className="w-8 h-8 text-muted-foreground" />
    </motion.div>
    <h3 className="font-display font-bold text-lg text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>
    {actionLabel && actionPath && (
      <Link to={actionPath}>
        <Button className="bg-gradient-primary text-primary-foreground">{actionLabel}</Button>
      </Link>
    )}
  </motion.div>
);

export default EmptyState;
