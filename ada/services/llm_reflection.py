"""LLM-powered reflection service for intelligent experience analysis."""

import json
from typing import Any, Optional

import anthropic

from ada.config import get_settings
from ada.models import SEALExperience

settings = get_settings()


class LLMReflectionService:
    """
    Service for LLM-powered reflection on agent experiences.

    Uses Claude AI to analyze experiences and extract deep insights.
    """

    def __init__(self):
        """Initialize LLM reflection service."""
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not set in environment")

        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.seal_model

    async def analyze_experiences(
        self,
        experiences: list[SEALExperience],
        agent_context: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Analyze experiences using LLM to extract insights.

        Args:
            experiences: List of experiences to analyze
            agent_context: Optional context about the agent

        Returns:
            Dict containing analysis results with patterns, insights, and learnings
        """
        if not experiences:
            return {
                "patterns": [],
                "insights": [],
                "skills_learned": [],
                "improvements": [],
            }

        # Prepare experience data for analysis
        experience_data = self._format_experiences(experiences)

        # Create analysis prompt
        prompt = self._create_analysis_prompt(experience_data, agent_context)

        # Call Claude API
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )

            # Parse response
            response_text = message.content[0].text
            analysis = self._parse_analysis_response(response_text)

            return analysis

        except Exception as e:
            print(f"Error in LLM analysis: {e}")
            # Return fallback analysis
            return self._fallback_analysis(experiences)

    def _format_experiences(self, experiences: list[SEALExperience]) -> str:
        """Format experiences for LLM analysis."""
        formatted = []

        for i, exp in enumerate(experiences, 1):
            exp_dict = {
                "number": i,
                "type": exp.experience_type,
                "task": exp.task_name,
                "action": exp.action_taken,
                "reasoning": exp.reasoning,
                "outcome": exp.outcome,
                "success": exp.success,
                "performance_score": exp.performance_score,
                "error": exp.error_message if exp.error_occurred else None,
            }

            # Remove None values
            exp_dict = {k: v for k, v in exp_dict.items() if v is not None}

            formatted.append(json.dumps(exp_dict, indent=2))

        return "\n\n".join(formatted)

    def _create_analysis_prompt(
        self,
        experience_data: str,
        agent_context: Optional[dict[str, Any]],
    ) -> str:
        """Create prompt for experience analysis."""
        context_str = ""
        if agent_context:
            context_str = f"\n\nAgent Context:\n{json.dumps(agent_context, indent=2)}"

        return f"""You are an AI expert analyzing agent experiences to extract learnings and insights.

Below are recent experiences from an AI agent. Your task is to:
1. Identify patterns in successful and failed experiences
2. Extract key insights and learnings
3. Identify skills the agent has developed
4. Suggest specific improvements

Experiences:
{experience_data}{context_str}

Please provide your analysis in the following JSON format:
{{
  "patterns": [
    {{
      "type": "success_pattern | error_pattern | behavioral_pattern",
      "title": "Brief title",
      "description": "Detailed description of the pattern",
      "frequency": "how often this pattern appears",
      "confidence": 0.0-1.0
    }}
  ],
  "insights": [
    {{
      "title": "Key insight title",
      "description": "Detailed insight",
      "importance": "high | medium | low",
      "applicable_contexts": ["context1", "context2"]
    }}
  ],
  "skills_learned": [
    {{
      "skill_name": "Name of the skill",
      "description": "What the agent learned",
      "proficiency": "beginner | intermediate | advanced",
      "evidence": "Supporting evidence from experiences"
    }}
  ],
  "improvements": [
    {{
      "area": "Area to improve",
      "suggestion": "Specific improvement suggestion",
      "priority": "high | medium | low",
      "expected_impact": "Expected positive impact"
    }}
  ]
}}

Provide only the JSON response, no additional text."""

    def _parse_analysis_response(self, response_text: str) -> dict[str, Any]:
        """Parse LLM analysis response."""
        try:
            # Try to extract JSON from response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                analysis = json.loads(json_str)
                return analysis
            else:
                raise ValueError("No JSON found in response")

        except Exception as e:
            print(f"Error parsing LLM response: {e}")
            return {
                "patterns": [],
                "insights": [],
                "skills_learned": [],
                "improvements": [],
            }

    def _fallback_analysis(self, experiences: list[SEALExperience]) -> dict[str, Any]:
        """Provide fallback analysis if LLM fails."""
        success_count = sum(1 for e in experiences if e.success is True)
        error_count = sum(1 for e in experiences if e.error_occurred)

        patterns = []
        if success_count > len(experiences) / 2:
            patterns.append(
                {
                    "type": "success_pattern",
                    "title": "High success rate observed",
                    "description": f"{success_count} out of {len(experiences)} experiences were successful",
                    "frequency": "frequent",
                    "confidence": 0.8,
                }
            )

        if error_count > 0:
            error_types = {}
            for exp in experiences:
                if exp.error_type:
                    error_types[exp.error_type] = error_types.get(exp.error_type, 0) + 1

            for error_type, count in error_types.items():
                patterns.append(
                    {
                        "type": "error_pattern",
                        "title": f"Recurring {error_type}",
                        "description": f"Observed {count} occurrences of {error_type}",
                        "frequency": "occasional" if count < 3 else "frequent",
                        "confidence": 0.7,
                    }
                )

        return {
            "patterns": patterns,
            "insights": [],
            "skills_learned": [],
            "improvements": [],
        }

    async def create_memory_from_insight(
        self,
        insight: dict[str, Any],
        pattern_type: str = "insight",
    ) -> dict[str, Any]:
        """
        Create a memory structure from an insight.

        Args:
            insight: Insight dict from analysis
            pattern_type: Type of memory to create

        Returns:
            Memory dict ready for database storage
        """
        if pattern_type == "pattern":
            return {
                "title": insight.get("title", "Learned Pattern"),
                "content": insight.get("description", ""),
                "confidence": insight.get("confidence", 0.5),
                "category": insight.get("type", "general"),
            }

        elif pattern_type == "insight":
            return {
                "title": insight.get("title", "Key Insight"),
                "content": insight.get("description", ""),
                "confidence": 0.8,
                "category": "insight",
                "importance_score": self._importance_from_level(
                    insight.get("importance", "medium")
                ),
            }

        elif pattern_type == "skill":
            return {
                "title": f"Skill: {insight.get('skill_name', 'Unknown')}",
                "content": insight.get("description", ""),
                "confidence": self._proficiency_to_confidence(
                    insight.get("proficiency", "beginner")
                ),
                "category": "skill",
            }

        else:
            return {
                "title": "General Learning",
                "content": str(insight),
                "confidence": 0.5,
                "category": "general",
            }

    def _importance_from_level(self, level: str) -> float:
        """Convert importance level to score."""
        mapping = {
            "high": 0.9,
            "medium": 0.6,
            "low": 0.3,
        }
        return mapping.get(level.lower(), 0.5)

    def _proficiency_to_confidence(self, proficiency: str) -> float:
        """Convert proficiency level to confidence score."""
        mapping = {
            "advanced": 0.9,
            "intermediate": 0.7,
            "beginner": 0.5,
        }
        return mapping.get(proficiency.lower(), 0.5)


# Singleton instance
_llm_reflection_service: Optional[LLMReflectionService] = None


def get_llm_reflection_service() -> LLMReflectionService:
    """Get LLM reflection service singleton."""
    global _llm_reflection_service
    if _llm_reflection_service is None:
        _llm_reflection_service = LLMReflectionService()
    return _llm_reflection_service
