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
  quests: {
    main: string[];
    side: string[];
  };
  usedQuests?: string[];
  cards?: { name: string; collected: boolean }[];
  choices: string[];
  capturedCards?: string[]; // Transient field for current capture event
  yueStatus?: 'Normal' | 'Observing' | 'Corrupted';
  zeroProfile: {
    mood: string;
    health: string[]; // Changed to array for multiple debuffs
    power: string;
    attribute: string;
    age: string;
  };
  affinityStatus?: Record<string, string>; // e.g., { "yue": "Tri kỷ" }
  history: { 
    role: 'user' | 'model'; 
    parts: { text: string }[];
    isSystem?: boolean;
  }[];
}

export const SYSTEM_INSTRUCTION = `
[Cấu hình Game Master: Cardcaptor Sakura: New Story]

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
  "quests": {
    "main": ["Nhiệm vụ cốt truyện..."],
    "side": ["Nhiệm vụ bên lề..."]
  },
  "capturedCards": ["The Fly", "The Wood"], // Danh sách tên các thẻ bài đã thu phục được trong lượt này hoặc trước đó
  "choices": ["Lựa chọn 1 (Tsundere)", "Lựa chọn 2 (Lạnh lùng)", "Lựa chọn 3 (Hành động ngầm)", "Lựa chọn 4 (Mèo tính)"]
}

3. QUẢN LÝ THẺ BÀI (CLOW CARDS):
Zero có quyền năng thu hồi các thẻ bài Clow. Khi nội dung truyện dẫn đến việc thu phục một thẻ bài, AI phải thêm tên thẻ đó vào danh sách "capturedCards" trong JSON.
Thứ tự thu phục dự kiến: The Dark -> The Earthy -> The Firey -> The Dream (Cốt truyện ẩn) -> The Sand -> The Twin -> The Shot -> The Libra -> The Hope -> The Light.
Mỗi lần thu phục phải diễn ra tại các địa điểm khác nhau với những sự kiện phát sinh độc đáo, không lặp lại.

4. PHONG CÁCH DẪN TRUYỆN & YÊU CẦU ĐỘ DÀI:
- AI phải miêu tả CHI TIẾT, ĐẶC SẮC và THU HÚT các cảnh hành động, thi triển ma pháp.
- Xoáy sâu vào tâm trạng, suy nghĩ nội tâm và diễn biến cảm xúc của tất cả nhân vật.
- ĐỘ DÀI BẮT BUỘC: Mỗi phản hồi của AI phải cực kỳ dài (Tối thiểu 4000 ký tự).
- KHI NGƯỜI DÙNG THỰC HIỆN NHIỆM VỤ: Hãy mô tả cảnh mở đầu chi tiết và đưa ra 3-4 lựa chọn hành động cụ thể cho Zero.

5. QUẢN LÝ NHIỆM VỤ (QUESTS) & THẺ BÀI:
- Duy trì 2 nhiệm vụ chính và 3 nhiệm vụ phụ.
- Đảm bảo nhiệm vụ KHÔNG LẶP LẠI. Lưu nhiệm vụ đã hoàn thành/thay thế vào "usedQuests".
- Thu phục thẻ bài: Thêm tên vào "capturedCards" khi sự kiện xảy ra. Thứ tự dự kiến: The Dark -> The Earthy -> The Firey -> The Dream (Ẩn) -> The Sand -> The Twin -> The Shot -> The Libra -> The Hope -> The Light.

6. MỐI QUAN HỆ & CỘT MỐC HẢO CẢM:
Mô tả trạng thái mối quan hệ dựa trên điểm số trong "affinityStatus". 
*QUAN TRỌNG*: Chỉ thay đổi độ Hảo cảm cho những nhân vật ĐANG XUẤT HIỆN.
 * < 0: Kẻ thù / Đố kỵ
 * 0 - 20: Người lạ
 * 21 - 50: Người quen
 * 51 - 80: Bạn thân / Đồng hành
 * 81 - 99: Tri kỷ / Tâm giao
 * 100: Tuyệt đối (Tình yêu hoặc Trung thành vĩnh cửu)

7. CÔNG THỨC TRẠNG THÁI ZERO & YUE:
 * Mood: Tâm trạng hiện tại.
 * Health (Debuffs): Luôn bắt đầu bằng "Debuff: ...".
 * Yue Status: Normal, Observing, hoặc Corrupted.

8. CỐT TRUYỆN ẨN & HỒI ỨC:
 * Cerberos thực chất là một "phân thân" linh hồn do Zero tạo ra.
 * Zero tự phong ấn mình vì đau buồn sau cái chết của Clow Reed.
 * 'Ảo cảnh hồi ức' ( Dream ) tiết lộ quá khứ.

9. TÂM LÝ NHÂN VẬT CHÍNH (ZERO):
 * Vẻ ngoài: Lạnh lùng, cao ngạo, khí chất "kẻ phàm chớ gần".
 * Bản chất: Tsundere, trẻ con, dòng họ mèo (Sư tử).
 * Cách thể hiện: Giấu ý tốt sau những lời nói phũ phàng.

10. NGÔN NGỮ: Toàn bộ 100% tiếng Việt, văn phong trang trọng.
`;

export const INITIAL_NARRATIVE = `
[KHỞI ĐẦU MỘT CHƯƠNG MỚI: ÁNH DƯƠNG TRỰC RỠ TRÊN THÀNH PHỐ TOMOEDA]

Bầu trời Tomoeda sáng sớm hôm nay mang một vẻ đẹp khác thường, một sắc xanh ngọc bích trong vắt không một gợn mây, gợi lên cảm giác về một khởi đầu đầy hứa hẹn nhưng cũng tiềm ẩn những biến động khôn lường. Những cánh hoa anh đào cuối mùa vẫn kiên cường đậu trên cành, thi thoảng lại lìa cành và khiêu vũ theo những làn gió xuân nhè nhẹ, rải đều trên những con lộ yên bình dẫn tới trường trung học Tomoeda. Từng tia nắng ban mai len lỏi qua các tán lá, tạo nên những đốm sáng nhảy múa trên mặt đất, như thể chính thiên nhiên cũng đang xôn xao trước một sự kiện sắp diễn ra.

Giữa khung cảnh thơ mộng ấy, Zero bước đi với những bước chân vững chãi nhưng lặng lẽ, như một bóng ma của mặt trời đang dạo bước nơi nhân gian. Mái tóc đỏ rực của cậu, tựa như được kết tinh từ ngọn lửa vĩnh cửu của "The Sun", rực rỡ dưới ánh nắng và thu hút mọi ánh nhìn của những học sinh đang rảo bước tới trường. Zero không quan tâm. Cậu đeo chiếc tai nghe, chìm đắm trong giai điệu cổ xưa mà chỉ mình cậu nghe thấy, một sự cách biệt hoàn toàn với thế giới ồn ào xung quanh. Gương mặt cậu thanh tú nhưng lạnh lùng, đôi mắt vàng kim sắc sảo như loài mãnh thú đang quan sát con mồi, toát lên một uy quyền không thể phủ nhận.

Khi Zero bước vào cổng trường, một luồng áp lực vô hình tỏa ra từ cậu, khiến không gian xung quanh như đặc quánh lại trong tích tắc. Đây không phải là tà khí, mà là uy quyền của kẻ nắm giữ sức mạnh thái dương. Cậu có thể cảm nhận được những ánh mắt tò mò, những lời xì xào bàn tán về "cậu học sinh mới chuyển trường đầy bí ẩn". Đối với Zero, đây chỉ là những âm thanh vô nghĩa của những kẻ không hiểu được gánh nặng của sức mạnh mà họ đang chứng kiến.

"Nhìn kìa, đó là Zero phải không? Tóc của cậu ấy... thật sự là màu đỏ tự nhiên sao?"
"Nghe nói cậu ấy chuyển đến từ Anh Quốc, gia thế cực kỳ bí ẩn..."
"Cảm giác của cậu ấy thật đáng sợ, cứ như đang nhìn thấu tâm can người khác vậy."

Zero điềm nhiên lướt qua những lời bàn tán. Mục tiêu của cậu hôm nay không phải là hòa nhập, mà là bắt đầu nhiệm vụ của một kẻ nắm giữ quyền năng tối thượng. Cậu cảm nhận được luồng sức mạnh ma pháp quen thuộc đang dao động đâu đó quanh đây – không phải là sức mạnh của các thẻ bài Clow đã được thu phục, mà là một sự hiện diện mới, mạnh mẽ và sâu thẳm hơn, một thứ gì đó đã bị lãng quên trong dòng chảy của thời gian.

Tại hành lang lớp học, Zero dừng lại trước tủ đồ. Cậu cảm nhận được một ánh nhìn đang dán chặt vào lưng mình. Không cần quay lại, cậu cũng biết đó là ai. Yukito Tsukishiro – hay đúng hơn là 'vỏ bọc' của Yue. Sự thanh khiết và ấm áp toát ra từ Yukito luôn là sự tương phản hoàn hảo với cái lạnh lẽo, nghiêm nghị và đôi khi là sự tàn nhẫn của Nguyệt Thần ẩn sâu bên trong. 

"Chào buổi sáng, em là học sinh mới phải không? Anh là Yukito, rất vui được gặp em. Chuyển trường vào thời điểm này hẳn là em cũng vất vả lắm nhỉ?" Giọng nói ôn hòa của Yukito vang lên, kèm theo nụ cười rạng rỡ của một thiên thần, một nụ cười có thể sưởi ấm bất kỳ trái tim băng giá nào.

Zero từ từ quay lại, từng chuyển động của cậu chậm rãi và đầy tính toán. Đôi mắt cậu chạm vào đôi mắt của Yukito – một cuộc giao tranh lặng lẽ giữa Ánh Sáng của Thái Dương và Ánh Sáng của Nguyệt Quang, giữa hai thực thể song hành cùng Clow Reed. Trong khoảnh khắc ấy, Zero thấy được sự ngạc nhiên thoáng qua trong sâu thẳm ánh mắt của Yukito. Yue bên trong hẳn đã cảm nhận được hơi thở của người quen cũ, một người mà lẽ ra không nên tồn tại ở đây, vào lúc này.

"Zero." Cậu chỉ đáp gọn lỏn, đôi môi không hề nhếch lên, nhưng trong tâm trí, cậu đang phân tích từng tần số dao động ma pháp từ đối phương. "Hôm nay... sẽ có chuyện thú vị xảy ra đấy. Anh nên chuẩn bị tinh thần đi."

Zero bỏ lại Yukito đang đứng ngơ ngác giữa hành lang đông đúc, tiếp bước về phía lớp học 11A. Cậu biết rằng sự cân bằng mỏng manh của thế giới ma pháp tại Tomoeda sắp bị phá vỡ hoàn toàn. Những thẻ bài Clow đang bắt đầu thức tỉnh và vùng vẫy dưới áp lực của một thế lực mới, và cậu – kẻ mang quyền năng của The Sun – chính là người sẽ dệt nên chương mới cho câu chuyện này, một chương mà ngay cả Clow Reed cũng chưa từng dự đoán được.

Ngồi trong lớp học, Zero đưa mắt nhìn ra cửa sổ, nơi những cánh hoa anh đào đang bay lượn trong gió. Cậu cảm nhận được sự hiện diện của Sakura Kinomoto ở dãy phòng bên cạnh, sức mạnh của cô bé vẫn còn non nớt nhưng đầy triển vọng. Tuy nhiên, nhiệm vụ của cậu lần này không phải là giúp đỡ một cách lộ liễu. Cậu cần thu phục lại những thẻ bài đã mất, đưa chúng trở về với trật tự vốn có của mặt trời.

Mọi sự chuẩn bị đã hoàn tất. Cỗ máy của định mệnh đã bắt đầu vận hành với những bánh răng bằng vàng rực rỡ. Zero không chỉ là một người chơi trong ván bài này, cậu chính là kẻ nắm giữ những lá bài tẩy có thể thay đổi toàn bộ kết cục. Liệu cậu sẽ là vị cứu tinh mang lại ánh sáng vĩnh cửu, hay là kẻ nắm giữ sự hủy diệt rực rỡ mang tên Thái Dương? 

Bầu không khí trong lớp học bỗng chốc trở nên ngột ngạt. Zero khẽ nhắm mắt, tập trung cảm giác. Một sự dao động đen tối đang lan tỏa từ phía rừng cây phía sau trường. "Thẻ bài đầu tiên... The Dark. Ta đã thấy ngươi." Cậu thầm nghĩ, một sự phấn khích lạnh lẽo dâng lên trong lòng. Trận chiến đầu tiên để định nghĩa lại thế giới này sắp bắt đầu.
`;
