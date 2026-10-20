import {
  Building2,
  Bus,
  Church,
  Coffee,
  Croissant,
  Dumbbell,
  GraduationCap,
  Hospital,
  Hotel,
  Landmark,
  Pill,
  School,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Store,
  Ticket,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { BusinessTypeId, PoiCategory } from "@spero/shared";

export const CATEGORY_ICONS: Record<PoiCategory, LucideIcon> = {
  college: GraduationCap,
  school: School,
  hospital: Hospital,
  transport: Bus,
  market: ShoppingBasket,
  worship: Church,
  hotel: Hotel,
  office: Building2,
  entertainment: Ticket,
  food: UtensilsCrossed,
};

export const BUSINESS_TYPE_ICONS: Record<BusinessTypeId, LucideIcon> = {
  cafe: Coffee,
  restaurant: UtensilsCrossed,
  pharmacy: Pill,
  gym: Dumbbell,
  salon: Scissors,
  bakery: Croissant,
  grocery: ShoppingBasket,
  clothing: Shirt,
  electronics: Smartphone,
  bank: Landmark,
};

/** Preset icons, with a neutral shop icon for custom business types. */
export function businessTypeIcon(type: string): LucideIcon {
  return BUSINESS_TYPE_ICONS[type as BusinessTypeId] ?? Store;
}
