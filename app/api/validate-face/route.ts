import { NextRequest, NextResponse } from "next/server";
import { geminiVision } from "@/lib/gemini-text";

export const maxDuration = 20;

export interface FaceValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export async function POST(req: NextRequest) {
  const { imageBase64, imageMime } = await req.json();
  if (!imageBase64 || !imageMime) {
    return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 });
  }

  try {
    const analysis = await geminiVision(
      `Analyze this photo for use as a face reference in AI identity-preserving image generation.

Evaluate these criteria and return ONLY valid JSON (no markdown, no explanation):

1. PERSON COUNT: Is there exactly ONE person visible in the photo?
2. FACE VISIBILITY: Is the face clearly visible (not covered, not too small)?
3. FACE ANGLE: Is the face relatively frontal? (±45° from camera is acceptable)
4. LIGHTING: Is the face lit well enough to see facial features? (not completely in shadow or heavily backlit)
5. DARK GLASSES: Are opaque/dark sunglasses covering the eyes?
6. HEAVY FILTER: Is the image heavily filtered, illustrated, cartoon-like, or AI-generated (not a real photograph)?

Return this exact JSON format:
{
  "valid": true,
  "issues": [],
  "warnings": []
}

"issues" = blocking problems (more than 1 person, face not visible, cartoon/AI image)
"warnings" = minor problems that reduce quality but won't block (slight angle, mediocre lighting, normal glasses)
"valid" = false only if there are issues, true otherwise

Examples of issues: "Mais de uma pessoa na foto", "Rosto não visível ou muito pequeno", "Imagem parece ser ilustração ou IA"
Examples of warnings: "Rosto em ângulo lateral — resultados melhores com rosto frontal", "Iluminação fraca — prefira fotos bem iluminadas", "Óculos normais podem reduzir qualidade"`,
      imageBase64,
      imageMime,
      { maxTokens: 150, temperature: 0 }
    );

    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ valid: true, issues: [], warnings: [] });

    const result: FaceValidationResult = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch {
    // Em caso de erro na validação, permitir geração (não bloquear por falha do validador)
    return NextResponse.json({ valid: true, issues: [], warnings: [] });
  }
}
