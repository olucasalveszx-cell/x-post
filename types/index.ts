export interface Slide {
  id: string;
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundImageLoading?: boolean;
  backgroundGradient?: string;
  backgroundCrop?: { top: number; right: number; bottom: number; left: number };
  backgroundPosition?: { x: number; y: number };
  backgroundZoom?: number;
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
  // Moldura (frame)
  frameImageUrl?: string;
  frameShape?: string;
  frameImageOffset?: { x: number; y: number }; // objectPosition em %, default 50 50
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
