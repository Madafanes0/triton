export interface AnalysisResult {
  errors: string[];
  warnings: string[];
  suggestions: string[];
  triton_kernels_found: string[];
  estimated_complexity: string;
}

export interface AgentStructuredResponse {
  explanation: string;
  modified_code: string | null;
  analysis: AnalysisResult;
}

export type AgentMessageRole = "user" | "assistant" | "system";

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  text: string;
  structured?: AgentStructuredResponse;
  rawFallback?: string;
  pending?: boolean;
  /** Editor snapshot before this assistant edit (for diff). */
  diffBefore?: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  detail?: Record<string, unknown>;
}
