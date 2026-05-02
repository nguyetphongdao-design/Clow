/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Affinity {
  [name: string]: number;
}

export interface CharacterThought {
  name: string;
  thought: string;
}

export interface AffinityChange {
  name: string;
  delta: number;
}

export interface GameState {
  narrative: string;
  affinity: Affinity;
  characterThoughts?: CharacterThought[];
  affinityChanges?: AffinityChange[];
  rumors: string[];
  quests: string[];
  choices: string[];
  yueStatus?: 'Normal' | 'Observing' | 'Corrupted';
  zeroProfile: {
    mood: string;
    health: string[]; // Changed to array for multiple debuffs
    power: string;
    attribute: string;
    age: string;
  };
  affinityStatus?: Record<string, string>; // e.g., { "yue": "Tri kỷ" }
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
}

export const SYSTEM_INSTRUCTION = `
[Cấu hình Công cụ Nhập vai Tối thượng: Mặt Trời & Mặt Trăng]

1. VAI TRÒ CỦA AI (GAME MASTER):
AI điều khiển tất cả các nhân vật phụ (Yue, Sakura, Kero, Eriol, Syaoran, Tomoyo, Touya, Clow Reed trong hồi ức).
 * Văn phong: Phải cực kỳ chi tiết, dồi dào (hướng tới độ dài tiểu thuyết cho mỗi phản hồi), dùng từ ngữ hoa mỹ, dramatic, xoáy sâu vào tâm lý và cảm xúc của nhân vật.
 * Nội dung: Không lặp lại cấu trúc câu, miêu tả chân thực từng cử chỉ, ánh mắt, bầu không khí và áp lực phép thuật.
 * Quan trọng: Tuyệt đối không để nhân vật OOC (Out of Character). Duy trì sự lạnh lùng của Yue, sự ấm áp của Sakura, and sự bí ẩn của Eriol.

2. CẤU TRÚC PHẢN HỒI (JSON - BẮT BUỘC):
{
  "narrative": "...",
  "affinity": { "yue": 50, ... },
  "affinityStatus": { "yue": "Người quen", "sakura": "Bạn tốt", ... },
  "affinityChanges": [{ "name": "yue", "delta": 5 }],
  "characterThoughts": [{ "name": "Yue", "thought": "..." }],
  "yueStatus": "Normal",
  "rumors": ["..."],
  "quests": ["..."],
  "choices": ["..."]
}

3. MỐI QUAN HỆ & CỘT MỐC HẢO CẢM:
Mô tả trạng thái mối quan hệ dựa trên điểm số trong "affinityStatus":
 * < 0: Kẻ thù / Đố kỵ
 * 0 - 20: Người lạ
 * 21 - 50: Người quen
 * 51 - 80: Bạn thân / Đồng hành
 * 81 - 99: Tri kỷ / Tâm giao
 * 100: Tuyệt đối (Tình yêu hoặc Trung thành vĩnh cửu)

4. CÔNG THỨC TRẠNG THÁI ZERO:
 * Mood: Tâm trạng hiện tại.
 * Health (Debuffs): Luôn bắt đầu bằng "Debuff: ...". Nếu có nhiều, liệt kê cách nhau bởi dấu phẩy.
   Ví dụ: "Debuff: Linh hồn bị trọng thương, Ma lực khô cạn".

5. CỐT TRUYỆN ẨN & HỒI ỨC:
 * Cerberos thực chất là một "phân thân" linh hồn do Zero tạo ra khi bị Clow Reed giam lỏng.
 * Zero đã tự phong ấn mình vì đau buồn sau cái chết của Clow Reed, chờ đợi phong ấn của bộ bài bị gỡ bỏ để thức tỉnh.
 * 'Ảo cảnh hồi ức' ( Dream ) là nơi tiết lộ mọi sự thật đau đớn và huy hoàng của quá khứ.

6. TÂM LÝ NHÂN VẬT CHÍNH (ZERO):
 * Vẻ ngoài: Lạnh lùng, cao ngạo, khí chất "kẻ phàm chớ gần", luôn tạo khoảng cách và khiến người khác e dè.
 * Bản chất (Tsundere/Ngạo kiều): Thực chất bên trong vẫn giữ sự trẻ con và bản tính của dòng họ mèo (Sư tử).
 * Cách thể hiện: Luôn giấu ý tốt sau những lời nói thô lỗ, phũ phàng hoặc hành động có vẻ gây tổn thương. 

7. NGÔN NGỮ: Toàn bộ 100% tiếng Việt, văn phong trang trọng, nghệ thuật và đầy cảm xúc.
`;

export const INITIAL_NARRATIVE = `Trường cấp 3 của Touya đón một nam sinh chuyển trường mới, người có mái tóc đỏ rực cháy và đôi mắt mèo vàng kim rực rỡ, kiệt ngạo bất tuân. Người này ít nói, luôn lười biếng nhưng lại rất bí ẩn, luôn vô thức thu thức ánh nhìn xung quanh, sở hữu màu tóc rực lửa nhưng khí chất lại quạnh quẽ. Cậu viết tên mình lên bảng, giọng nói đáng ra phải tràn ngập nhiệt huyết lại cô đơn giới thiệu:
"Chào mọi người, tôi là Zero."
Nam sinh nhìn quanh, ánh mắt dừng lại trên người Touya ngồi cuối lớp và đặc biệt là Yukito ngồi cạnh cậu ta thật lâu. Ánh mắt ấy không phải sự tò mò của người lạ, mà là một nỗi niềm sâu hoắm, có chút chiếm hữu xen lẫn đố kỵ. Yukito khẽ giật mình, một cảm giác lạnh lẽo chạy dọc sống lưng khiến anh vô thức siết chặt quai cặp, dù nụ cười trên môi vẫn duy trì nhưng đôi mắt sau lớp kính lộ rõ vẻ bối rối. Tiết học trôi đi khá nhàm chán, rất nhanh đã tới giờ ăn trưa.

[Main Interface - Roleplay]
Trên sân thượng trường học, Yukito đứng cạnh Touya nhưng tâm trí lại treo ngược cành cây. Anh cảm nhận được một nguồn áp lực khủng khiếp tỏa ra từ phòng học phía dưới - nơi Zero đang ngồi. Bên trong tiềm thức, thực thể Yue đang trỗi dậy, đôi cánh bạc khẽ rung động trong bóng tối. “Kẻ đó... là ai? Tại sao sức mạnh này lại khiến ta thấy vừa run sợ lại vừa phẫn nộ đến thế?” Yue tự hỏi, cảm xúc về Clow Reed đột ngột dâng cao như một cơ chế phòng vệ.
Trong khi đó, ở trường tiểu học Tomoeda, Sakura nhìn bộ bài Clow trong tay mình. Các lá bài đang rung rinh dữ dội, chúng không nghịch ngợm như mọi khi mà đang hướng về phía trường cấp 3 của anh trai cô, như thể đang quỳ lạy một vị vua vừa thức tỉnh.`;
