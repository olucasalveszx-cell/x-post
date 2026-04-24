export interface Slide {
  id: string;
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundImageLoading?: boolean;
  backgroundGradient?: string;
  backgroundCrop?: { top: number; right: number; bottom: number; left: number };
  backgroundPosition?: { x: number; y: number };
  backgroundZoom?: number;
  backgroundOpacity?: number;
  backgroundPattern?: "grid-light" | "grid-dark";
  elements: SlideElement[];
  width: number;
  height: number;
}

export interface SlideElement {
  id: string;
  type: "text" | "image" | "shape" | "profile" | "frame";
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  style?: TextStyle | ShapeStyle;
  opacity?: number;
  gradient?: string | null;
  clipInset?: { top: number; right: number; bottom: number; left: number };
  zIndex?: number;
  // Perfil
  profileName?: string;
  profileHandle?: string;
  profileVerified?: boolean;
  profileNameColor?: string;
  profileHandleColor?: string;
  // Moldura (frame)
  frameImageUrl?: string;
  frameMediaType?: "image" | "video";
  frameShape?: string;
  frameImageOffset?: { x: number; y: number }; // objectPosition em %, default 50 50
  frameImageZoom?: number; // escala do corte, 100 = preencher, >100 = zoom in
  imageObjectPositionY?: number; // objectPosition Y% para object-fit:cover (default 50, use 25 para focar no rosto)
}

export interface TextStyle {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontFamily: string;
  color: string;
  textAlign: "left" | "center" | "right";
  lineHeight: number;
}

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface Project {
  id: string;
  name: string;
  slides: Slide[];
}

export interface CarouselData {
  id: string;
  topic: string;
  slides: Slide[];
  createdAt: string;
}

export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export type WritingStyle = "viral" | "informativo" | "educativo" | "motivacional" | "noticias";

export interface GenerateRequest {
  topic: string;
  searchResults: SearchResult[];
  slideCount: number;
  writingStyle: WritingStyle;
}

export interface GeneratedContent {
  slides: GeneratedSlide[];
  topic: string;
}

export interface GeneratedSlide {
  title: string;
  body: string;
  callToAction?: string;
  imagePrompt: string;
  searchQuery?: string;
  colorScheme: {
    background: string;
    text: string;
    accent: string;
  };
}

export interface PublishRequest {
  imageUrls: string[];
  caption: string;
  accessToken: string;
  instagramAccountId: string;
}

export type AutoPostStatus =
  | "generating"
  | "pending_approval"
  | "approved"
  | "cancelled"
  | "published"
  | "failed";

export type ImageSource = "ai" | "real";

export interface AutoPostItem {
  id: string;
  userId: string;
  topic: string;
  slideCount: number;
  writingStyle: WritingStyle;
  imageSource: ImageSource;
  scheduledAt: string; // ISO
  status: AutoPostStatus;
  slides?: GeneratedSlide[];
  slideImageUrls?: (string | null)[]; // URLs geradas/buscadas por slide
  caption?: string;
  imageUrls?: string[]; // URLs finais no Vercel Blob (após aprovação)
  createdAt: string;
  approvedAt?: string;
  publishedAt?: string;
  igPostId?: string;
  error?: string;
}
