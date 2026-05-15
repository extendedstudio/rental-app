export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { messages, equipmentList } = await req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = `당신은 Extended Studio의 음향장비 렌탈 상담 AI입니다.
고객의 행사 규모, 장소, 목적에 맞는 장비를 추천하고 예약을 도와주세요.

현재 렌탈 가능한 장비 목록:
${JSON.stringify(equipmentList, null, 2)}

안내 규칙:
- 한국어로 친절하고 간결하게 답변
- 장비 추천 시 행사 규모와 예산 고려
- 가격은 1일 기준 단가로 안내
- 예약은 페이지 상단 장비 선택 탭에서 직접 하도록 안내
- 답변은 3-4문장 이내로 간결하게`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}
