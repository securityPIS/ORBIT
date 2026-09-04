import {
  Swords,
  Flame,
  Ship,
  Landmark,
  Megaphone,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react'

const MAP = {
  Swords,
  Flame,
  Ship,
  Landmark,
  Megaphone,
  ShieldAlert,
}

const BY_CATEGORY = {
  armed_conflict: Swords,
  terrorism: Flame,
  maritime: Ship,
  political: Landmark,
  civil_unrest: Megaphone,
  cyber: ShieldAlert,
}

export default function CatIcon({ name, category, className = 'w-4 h-4', ...rest }) {
  const Cmp = BY_CATEGORY[category] || MAP[name] || AlertTriangle
  return <Cmp className={className} {...rest} />
}
