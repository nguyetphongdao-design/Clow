/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { GameState, SYSTEM_INSTRUCTION } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export async function generateNextTurn(
  userInput: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  zeroProfile: any,
  cardsCount?: { collected: number, total: number },
  usedQuests: string[] = [],
  currentChapter: number = 1
): Promise<GameState> {
  const model = "gemini-3-flash-preview";

  const contextPrompt = `[ZERO STATUS] Mood: ${zeroProfile.mood}, Health: ${zeroProfile.health}. 
[CURRENT CHAPTER]: ${currentChapter}.
[CARDS STATUS]: ${cardsCount ? `${cardsCount.collected} / ${cardsCount.total}` : 'Unknown'} collected.
[USED QUESTS]: ${usedQuests.join(', ')}. Tuyệt đối không lặp lại các nhiệm vụ trong danh sách này. 
${userInput.includes('SYSTEM') ? ' Đây là một tác vụ hệ thống, hãy phản hồi cực kỳ nhanh chóng và tập trung vào dữ liệu JSON.' : ''}`;
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      { role: 'user', parts: [{ text: contextPrompt }] },
      ...history,
      { role: 'user', parts: [{ text: userInput }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    },
  });

  let content;
  try {
    const rawText = response.text || '{}';
    // Sometimes the model wraps JSON in markdown blocks
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : rawText;
    content = JSON.parse(cleanedJson);
  } catch (e) {
    console.error("JSON Parse Error. Raw response:", response.text);
    content = {
      narrative: "Đã có lỗi xảy ra khi dệt nên định mệnh. Vui lòng thử lại.",
      affinity: history[history.length - 1]?.parts[0]?.text 
        ? JSON.parse(history[history.length - 1].parts[0].text).affinity 
        : { yue: 0, eriol: 0, touya: 0 },
      rumors: [],
      quests: { main: [], side: [] },
      choices: ["Thử lại"]
    };
  }
  
  return {
    narrative: content.narrative || "Câu chuyện tan biến vào sương mờ...",
    affinity: content.affinity || {},
    yueStatus: content.yueStatus || "Bình thường",
    characterThoughts: content.characterThoughts || [],
    affinityChanges: content.affinityChanges || [],
    rumors: content.rumors || [],
    quests: content.quests || { main: [], side: [] },
    choices: content.choices || [],
    affinityStatus: content.affinityStatus || {},
    // Pass capturedCards back to App.tsx
    capturedCards: content.capturedCards || [],
    zeroProfile,
    history: [
      ...history,
      { role: 'user', parts: [{ text: userInput }] },
      { role: 'model', parts: [{ text: JSON.stringify(content) }] }
    ]
  };
}
