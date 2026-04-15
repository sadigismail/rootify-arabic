export interface UsageExample { ar: string; en: string }
export interface UsageMistake { wrong_ar: string; right_ar: string; note_en: string }
export interface VerbUsage {
  level_1: UsageExample;
  level_2: UsageExample;
  level_3: UsageExample;
  patterns: UsageExample[];
  mistakes: UsageMistake[];
}

export const USAGE: Readonly<Record<string, VerbUsage>> = {

  "كتب": {
    level_1: { ar: "كَتَبَ الوَلَدُ الدَّرسَ.", en: "The boy wrote the lesson." },
    level_2: { ar: "كَتَبَ الطَّالِبُ رِسالَةً إِلى صَديقِهِ.", en: "The student wrote a letter to his friend." },
    level_3: { ar: "كَتَبَ الرِّوائِيُّ عَمَلًا أَدَبِيًّا يَعكِسُ تَجرِبَتَهُ الشَّخصِيَّة.", en: "The novelist wrote a literary work reflecting his personal experience." },
    patterns: [
      { ar: "كَتَبَ إِلى (شَخص)", en: "wrote to (someone)" },
      { ar: "كَتَبَ عَن (مَوضوع)", en: "wrote about (a topic)" },
      { ar: "كَتَبَ بِ (أَداة)", en: "wrote with (an instrument)" },
    ],
    mistakes: [
      { wrong_ar: "كَتَبَ لِلدَّرسِ", right_ar: "كَتَبَ الدَّرسَ", note_en: "كتب takes a direct object, not لِ for the thing written." },
    ],
  },

  "قرأ": {
    level_1: { ar: "قَرَأَ الكِتابَ.", en: "He read the book." },
    level_2: { ar: "قَرَأَتِ الطَّالِبَةُ المَقالَ بِعِنايَةٍ.", en: "The student (f.) read the article carefully." },
    level_3: { ar: "قَرَأَ البَاحِثُ عَشَراتِ المَراجِعِ قَبلَ أَن يُنجِزَ دِراسَتَهُ.", en: "The researcher read dozens of references before completing his study." },
    patterns: [
      { ar: "قَرَأَ عَلى (شَخص)", en: "recited to (someone)" },
      { ar: "قَرَأَ في (كِتاب)", en: "read in (a book)" },
    ],
    mistakes: [
      { wrong_ar: "قَرَأَ مِنَ الكِتابِ", right_ar: "قَرَأَ في الكِتابِ / قَرَأَ الكِتابَ", note_en: "Use في for 'read in' a book, or a direct object. مِن is not standard here." },
    ],
  },

  "درس": {
    level_1: { ar: "دَرَسَ الطَّالِبُ جَيِّدًا.", en: "The student studied well." },
    level_2: { ar: "دَرَسَ اللُّغَةَ العَرَبِيَّةَ في الجامِعَةِ.", en: "He studied Arabic at the university." },
    level_3: { ar: "دَرَسَ الفَريقُ البَحثِيُّ أَثَرَ التَّغَيُّرِ المَناخِيِّ عَلى الزِّراعَةِ.", en: "The research team studied the impact of climate change on agriculture." },
    patterns: [
      { ar: "دَرَسَ (مادَّة)", en: "studied (a subject)" },
      { ar: "دَرَسَ في (مَكان)", en: "studied at (a place)" },
    ],
    mistakes: [],
  },

  "ذهب": {
    level_1: { ar: "ذَهَبَ إِلى المَدرَسَةِ.", en: "He went to school." },
    level_2: { ar: "ذَهَبَتِ الأُسرَةُ إِلى السّوقِ صَباحًا.", en: "The family went to the market in the morning." },
    level_3: { ar: "ذَهَبَ المُفاوِضونَ إِلى طاوِلَةِ الحِوارِ وَهُم يَحمِلونَ مَطالِبَ جَديدَةً.", en: "The negotiators went to the dialogue table carrying new demands." },
    patterns: [
      { ar: "ذَهَبَ إِلى (مَكان)", en: "went to (a place)" },
      { ar: "ذَهَبَ بِ (شَخص / شَيء)", en: "took away (someone/something)" },
    ],
    mistakes: [
      { wrong_ar: "ذَهَبَ المَدرَسَةَ", right_ar: "ذَهَبَ إِلى المَدرَسَةِ", note_en: "ذهب is intransitive; it requires إلى for the destination." },
    ],
  },

  "جلس": {
    level_1: { ar: "جَلَسَ عَلى الكُرسِيِّ.", en: "He sat on the chair." },
    level_2: { ar: "جَلَسَتِ الطِّفلَةُ بِجانِبِ أُمِّها في الحَديقَةِ.", en: "The girl sat next to her mother in the park." },
    level_3: { ar: "جَلَسَ الوَزيرُ مَعَ المَسؤولينَ لِمُناقَشَةِ المِيزانِيَّةِ العامَّةِ.", en: "The minister sat with the officials to discuss the general budget." },
    patterns: [
      { ar: "جَلَسَ عَلى / في (مَكان)", en: "sat on / in (a place)" },
      { ar: "جَلَسَ مَعَ (شَخص)", en: "sat with (someone)" },
    ],
    mistakes: [],
  },

  "فتح": {
    level_1: { ar: "فَتَحَ البابَ.", en: "He opened the door." },
    level_2: { ar: "فَتَحَتِ الأُمُّ النّافِذَةَ لِيَدخُلَ الهَواءُ.", en: "The mother opened the window to let the air in." },
    level_3: { ar: "فَتَحَ المُستَثمِرُ فَرعًا جَديدًا لِلشَّرِكَةِ في العاصِمَةِ.", en: "The investor opened a new branch of the company in the capital." },
    patterns: [
      { ar: "فَتَحَ (شَيئًا)", en: "opened (something)" },
      { ar: "فَتَحَ عَلى (شَخص)", en: "prompted / helped someone recall" },
    ],
    mistakes: [],
  },

  "أكل": {
    level_1: { ar: "أَكَلَ التُّفّاحَةَ.", en: "He ate the apple." },
    level_2: { ar: "أَكَلَ الأَطفالُ الغَداءَ في المَطبَخِ.", en: "The children ate lunch in the kitchen." },
    level_3: { ar: "أَكَلَ الصَّدَأُ الحَديدَ بَعدَ سَنَواتٍ مِنَ الإِهمالِ.", en: "Rust ate away the iron after years of neglect." },
    patterns: [
      { ar: "أَكَلَ (طَعامًا)", en: "ate (food)" },
      { ar: "أَكَلَ مِن (شَيء)", en: "ate from / ate some of (something)" },
    ],
    mistakes: [
      { wrong_ar: "أَكَلَ مِنَ التُّفّاحِ", right_ar: "أَكَلَ تُفّاحَةً / أَكَلَ مِنَ التُّفّاحِ", note_en: "Both are correct, but مِن implies 'some of', while the direct object means eating the whole thing." },
    ],
  },

  "شرب": {
    level_1: { ar: "شَرِبَ الماءَ.", en: "He drank water." },
    level_2: { ar: "شَرِبَتِ البِنتُ كوبَ حَليبٍ قَبلَ النَّومِ.", en: "The girl drank a glass of milk before sleep." },
    level_3: { ar: "شَرِبَ القَهوَةَ عَلى مَهلٍ وَهُوَ يَتَأَمَّلُ المَنظَرَ مِنَ الشُّرفَةِ.", en: "He drank coffee slowly while contemplating the view from the balcony." },
    patterns: [
      { ar: "شَرِبَ (مَشروبًا)", en: "drank (a beverage)" },
      { ar: "شَرِبَ مِن (مَصدَر)", en: "drank from (a source)" },
    ],
    mistakes: [],
  },

  "سمع": {
    level_1: { ar: "سَمِعَ الصَّوتَ.", en: "He heard the sound." },
    level_2: { ar: "سَمِعَ الطِّفلُ أَغنِيَةً جَميلَةً في الإِذاعَةِ.", en: "The child heard a beautiful song on the radio." },
    level_3: { ar: "سَمِعَ المُحَقِّقُ شَهادَةَ الشُّهودِ بِاهتِمامٍ بالِغٍ.", en: "The investigator listened to the testimony of the witnesses with great attention." },
    patterns: [
      { ar: "سَمِعَ (شَيئًا / شَخصًا)", en: "heard (something / someone)" },
      { ar: "سَمِعَ عَن (خَبَر)", en: "heard about (news)" },
      { ar: "سَمِعَ بِ (شَيء)", en: "heard of (something)" },
      { ar: "سَمِعَ مِن (شَخص)", en: "heard from (someone)" },
    ],
    mistakes: [
      { wrong_ar: "سَمِعَ إِلى المُوسيقى", right_ar: "اِستَمَعَ إِلى المُوسيقى", note_en: "For intentional listening, use اِستَمَعَ إلى (Measure VIII), not سَمِعَ." },
    ],
  },

  "عرف": {
    level_1: { ar: "عَرَفَ الجَوابَ.", en: "He knew the answer." },
    level_2: { ar: "عَرَفَتِ المُعَلِّمَةُ أَنَّ الطَّالِبَ لَم يَدرُس.", en: "The teacher (f.) knew that the student hadn't studied." },
    level_3: { ar: "عَرَفَ العالَمُ العَرَبِيُّ تَحَوُّلاتٍ سِياسِيَّةً كَبيرَةً في العَقدِ الأَخيرِ.", en: "The Arab world experienced major political transformations in the last decade." },
    patterns: [
      { ar: "عَرَفَ (شَيئًا / شَخصًا)", en: "knew (something / someone)" },
      { ar: "عَرَفَ أَنَّ ...", en: "knew that ..." },
    ],
    mistakes: [],
  },

  "فهم": {
    level_1: { ar: "فَهِمَ الدَّرسَ.", en: "He understood the lesson." },
    level_2: { ar: "فَهِمَ الطَّالِبُ القاعِدَةَ بَعدَ الشَّرحِ.", en: "The student understood the rule after the explanation." },
    level_3: { ar: "فَهِمَ المُحَلِّلُ الأَبعادَ الاقتِصادِيَّةَ لِلأَزمَةِ بَعدَ دِراسَةٍ مُعَمَّقَةٍ.", en: "The analyst understood the economic dimensions of the crisis after an in-depth study." },
    patterns: [
      { ar: "فَهِمَ (شَيئًا)", en: "understood (something)" },
      { ar: "فَهِمَ مِن (شَخص / كَلام)", en: "understood from (someone / speech)" },
    ],
    mistakes: [
      { wrong_ar: "فَهِمَ عَلَيهِ", right_ar: "فَهِمَ كَلامَهُ / فَهِمَ مِنهُ", note_en: "فَهِمَ عَلَيهِ is colloquial. In MSA use فَهِمَ كَلامَهُ or فَهِمَ مِنهُ." },
    ],
  },

  "علم": {
    level_1: { ar: "عَلِمَ بِالخَبَرِ.", en: "He learned of the news." },
    level_2: { ar: "عَلِمَ المُديرُ بِالمُشكِلَةِ صَباحَ اليَومِ.", en: "The manager learned of the problem this morning." },
    level_3: { ar: "عَلِمَ الرَّأيُ العامُّ بِتَفاصيلِ الاتِّفاقِيَّةِ بَعدَ نَشرِها في الصُّحُفِ.", en: "Public opinion learned the details of the agreement after it was published in newspapers." },
    patterns: [
      { ar: "عَلِمَ بِ (شَيء)", en: "learned of / found out about" },
      { ar: "عَلِمَ أَنَّ ...", en: "learned that ..." },
    ],
    mistakes: [
      { wrong_ar: "عَلِمَ الخَبَرَ", right_ar: "عَلِمَ بِالخَبَرِ", note_en: "عَلِمَ typically takes بِ for 'learning of' information." },
    ],
  },

  "وجد": {
    level_1: { ar: "وَجَدَ المِفتاحَ.", en: "He found the key." },
    level_2: { ar: "وَجَدَتِ الشُّرطَةُ الدَّليلَ في مَكانِ الحادِثِ.", en: "The police found the evidence at the scene." },
    level_3: { ar: "وَجَدَ الباحِثونَ أَنَّ هُناكَ عَلاقَةً وَثيقَةً بَينَ النَّومِ وَالأَداءِ الذِّهنِيِّ.", en: "The researchers found a strong link between sleep and mental performance." },
    patterns: [
      { ar: "وَجَدَ (شَيئًا / شَخصًا)", en: "found (something / someone)" },
      { ar: "وَجَدَ أَنَّ ...", en: "found that ..." },
      { ar: "وَجَدَ في (مَكان / شَخص)", en: "found in (a place / a person)" },
    ],
    mistakes: [],
  },

  "أخذ": {
    level_1: { ar: "أَخَذَ الكِتابَ.", en: "He took the book." },
    level_2: { ar: "أَخَذَ الوَلَدُ حَقيبَتَهُ وَذَهَبَ إِلى المَدرَسَةِ.", en: "The boy took his bag and went to school." },
    level_3: { ar: "أَخَذَتِ الحُكومَةُ قَرارًا بِتَجميدِ الأَسعارِ لِمُدَّةِ سِتَّةِ أَشهُرٍ.", en: "The government took a decision to freeze prices for six months." },
    patterns: [
      { ar: "أَخَذَ (شَيئًا) مِن (شَخص / مَكان)", en: "took (something) from (someone / a place)" },
      { ar: "أَخَذَ يَفعَلُ ...", en: "began doing ... (inchoative)" },
    ],
    mistakes: [
      { wrong_ar: "أَخَذَ لَهُ الكِتابَ", right_ar: "أَخَذَ مِنهُ الكِتابَ", note_en: "Use مِن for 'took from'. لَهُ means 'for him'." },
    ],
  },

  "قال": {
    level_1: { ar: "قالَ: \"مَرحَبًا\".", en: "He said: 'Hello.'" },
    level_2: { ar: "قالَ المُعَلِّمُ لِلطُّلّابِ أَن يَفتَحوا الكِتابَ.", en: "The teacher told the students to open the book." },
    level_3: { ar: "قالَ المُتَحَدِّثُ الرَّسمِيُّ إِنَّ المُفاوَضاتِ أَسفَرَت عَن نَتائِجَ إيجابِيَّةٍ.", en: "The official spokesperson said that the negotiations yielded positive results." },
    patterns: [
      { ar: "قالَ لِ (شَخص)", en: "said to / told (someone)" },
      { ar: "قالَ إِنَّ / أَنَّ ...", en: "said that ..." },
      { ar: "قالَ عَن (شَخص / شَيء)", en: "said about (someone / something)" },
    ],
    mistakes: [
      { wrong_ar: "قالَ لَهُ بِأَنَّ", right_ar: "قالَ لَهُ إِنَّ", note_en: "After قال, use إِنَّ (not بِأَنَّ) to introduce the clause." },
    ],
  },

  "عمل": {
    level_1: { ar: "عَمِلَ في المَصنَعِ.", en: "He worked in the factory." },
    level_2: { ar: "عَمِلَتْ سَنَتَينِ في شَرِكَةٍ دَولِيَّةٍ.", en: "She worked for two years at an international company." },
    level_3: { ar: "عَمِلَ الفَريقُ عَلى تَطويرِ مَنظومَةٍ رَقمِيَّةٍ تَخدِمُ المُستَخدِمينَ في عِدَّةِ دُوَلٍ.", en: "The team worked on developing a digital system serving users in several countries." },
    patterns: [
      { ar: "عَمِلَ في (مَجال / مَكان)", en: "worked in (a field / place)" },
      { ar: "عَمِلَ عَلى (مَشروع)", en: "worked on (a project)" },
    ],
    mistakes: [
      { wrong_ar: "عَمِلَ كَ مُهَندِسٍ", right_ar: "عَمِلَ مُهَندِسًا", note_en: "Use the حال (accusative) for profession, not كَ." },
    ],
  },

  "دخل": {
    level_1: { ar: "دَخَلَ البَيتَ.", en: "He entered the house." },
    level_2: { ar: "دَخَلَ الضَّيفُ الغُرفَةَ بِهُدوءٍ.", en: "The guest entered the room quietly." },
    level_3: { ar: "دَخَلَتِ الشَّرِكَةُ سوقًا جَديدًا بَعدَ سَنَواتٍ مِنَ التَّحضيرِ.", en: "The company entered a new market after years of preparation." },
    patterns: [
      { ar: "دَخَلَ (مَكانًا)", en: "entered (a place) — direct object" },
      { ar: "دَخَلَ في (أَمرٍ)", en: "entered into (a matter / discussion)" },
      { ar: "دَخَلَ عَلى (شَخص)", en: "entered upon / came in on (someone)" },
    ],
    mistakes: [
      { wrong_ar: "دَخَلَ إِلى البَيتِ", right_ar: "دَخَلَ البَيتَ", note_en: "دَخَلَ takes a direct object in MSA. إلى is common in dialects but not standard." },
    ],
  },

  "خرج": {
    level_1: { ar: "خَرَجَ مِنَ البَيتِ.", en: "He left the house." },
    level_2: { ar: "خَرَجَتِ العائِلَةُ في نُزهَةٍ يَومَ الجُمعَةِ.", en: "The family went out on a trip on Friday." },
    level_3: { ar: "خَرَجَ المُتَظاهِرونَ إِلى الشَّوارِعِ مُطالِبينَ بِإِصلاحاتٍ اقتِصادِيَّةٍ.", en: "Protesters went out to the streets demanding economic reforms." },
    patterns: [
      { ar: "خَرَجَ مِن (مَكان)", en: "left / exited (a place)" },
      { ar: "خَرَجَ إِلى (مَكان)", en: "went out to (a place)" },
      { ar: "خَرَجَ عَن (قاعِدَة)", en: "deviated from (a rule)" },
    ],
    mistakes: [],
  },

  "رجع": {
    level_1: { ar: "رَجَعَ إِلى البَيتِ.", en: "He returned home." },
    level_2: { ar: "رَجَعَتِ الطَّالِبَةُ مِنَ المَكتَبَةِ مَساءً.", en: "The student (f.) returned from the library in the evening." },
    level_3: { ar: "رَجَعَ المُفاوِضُ إِلى العاصِمَةِ حامِلًا مَسوَدَّةَ الاتِّفاقِ النِّهائِيِّ.", en: "The negotiator returned to the capital carrying the draft of the final agreement." },
    patterns: [
      { ar: "رَجَعَ إِلى (مَكان)", en: "returned to (a place)" },
      { ar: "رَجَعَ مِن (مَكان)", en: "returned from (a place)" },
      { ar: "رَجَعَ عَن (رَأي)", en: "retracted / went back on (an opinion)" },
    ],
    mistakes: [],
  },

  "نظر": {
    level_1: { ar: "نَظَرَ إِلى السَّماءِ.", en: "He looked at the sky." },
    level_2: { ar: "نَظَرَ المُعَلِّمُ في دَفاتِرِ الطُّلّابِ.", en: "The teacher looked through the students' notebooks." },
    level_3: { ar: "نَظَرَتِ المَحكَمَةُ في القَضِيَّةِ وَأَصدَرَت حُكمًا نِهائِيًّا.", en: "The court examined the case and issued a final ruling." },
    patterns: [
      { ar: "نَظَرَ إِلى (شَيء)", en: "looked at (something)" },
      { ar: "نَظَرَ في (أَمر)", en: "examined / considered (a matter)" },
    ],
    mistakes: [
      { wrong_ar: "نَظَرَ الكِتابَ", right_ar: "نَظَرَ في الكِتابِ / نَظَرَ إِلى الكِتابِ", note_en: "نَظَرَ is intransitive; it always needs إلى or في." },
    ],
  },

  "طلب": {
    level_1: { ar: "طَلَبَ الماءَ.", en: "He asked for water." },
    level_2: { ar: "طَلَبَ المُوَظَّفُ إِجازَةً مِنَ المُديرِ.", en: "The employee requested a leave from the manager." },
    level_3: { ar: "طَلَبَتِ المُنَظَّمَةُ مِنَ الدُّوَلِ الأَعضاءِ زِيادَةَ مُساهَماتِها المالِيَّةِ.", en: "The organization asked member states to increase their financial contributions." },
    patterns: [
      { ar: "طَلَبَ (شَيئًا)", en: "requested (something)" },
      { ar: "طَلَبَ مِن (شَخص) أَن ...", en: "asked (someone) to ..." },
    ],
    mistakes: [],
  },

  "حصل": {
    level_1: { ar: "حَصَلَ عَلى جائِزَةٍ.", en: "He got a prize." },
    level_2: { ar: "حَصَلَتِ الطَّالِبَةُ عَلى المَركَزِ الأَوَّلِ.", en: "The student (f.) got first place." },
    level_3: { ar: "حَصَلَتِ الشَّرِكَةُ عَلى تَرخيصٍ لِلعَمَلِ في ثَلاثِ دُوَلٍ جَديدَةٍ.", en: "The company obtained a license to operate in three new countries." },
    patterns: [
      { ar: "حَصَلَ عَلى (شَيء)", en: "obtained / got (something)" },
    ],
    mistakes: [
      { wrong_ar: "حَصَلَ الجائِزَةَ", right_ar: "حَصَلَ عَلى الجائِزَةِ", note_en: "حَصَلَ requires عَلى. It does not take a direct object." },
    ],
  },

  "سأل": {
    level_1: { ar: "سَأَلَ المُعَلِّمَ.", en: "He asked the teacher." },
    level_2: { ar: "سَأَلَ الصَّحَفِيُّ الوَزيرَ عَنِ الخُطَّةِ الجَديدَةِ.", en: "The journalist asked the minister about the new plan." },
    level_3: { ar: "سَأَلَ المُحَقِّقُ المُتَّهَمَ عَن تَفاصيلِ ما حَدَثَ لَيلَةَ الحادِثِ.", en: "The investigator asked the accused about the details of what happened the night of the incident." },
    patterns: [
      { ar: "سَأَلَ (شَخصًا) عَن (شَيء)", en: "asked (someone) about (something)" },
      { ar: "سَأَلَ (شَخصًا) (شَيئًا)", en: "asked (someone) (something) — double accusative" },
    ],
    mistakes: [],
  },

  "جعل": {
    level_1: { ar: "جَعَلَهُ سَعيدًا.", en: "He made him happy." },
    level_2: { ar: "جَعَلَ المُديرُ الاجتِماعَ قَصيرًا.", en: "The manager made the meeting short." },
    level_3: { ar: "جَعَلَتِ الإِصلاحاتُ الاقتِصادِيَّةُ الاستِثمارَ الأَجنَبِيَّ أَكثَرَ جاذِبِيَّةً.", en: "The economic reforms made foreign investment more attractive." },
    patterns: [
      { ar: "جَعَلَ (شَيئًا) (صِفَة)", en: "made (something) (adj.) — double accusative" },
      { ar: "جَعَلَ يَفعَلُ ...", en: "began doing ... (inchoative)" },
    ],
    mistakes: [],
  },

  "كلم": {
    level_1: { ar: "كَلَّمَ صَديقَهُ.", en: "He spoke to his friend." },
    level_2: { ar: "كَلَّمَتِ الأُمُّ ابنَها عَنِ السُّلوكِ الجَيِّدِ.", en: "The mother spoke to her son about good behavior." },
    level_3: { ar: "كَلَّمَ الرَّئيسُ الشَّعبَ في خِطابٍ مُتَلفَزٍ حَوَلَ الأَوضاعِ الاقتِصادِيَّةِ.", en: "The president addressed the nation in a televised speech about the economic situation." },
    patterns: [
      { ar: "كَلَّمَ (شَخصًا)", en: "spoke to / addressed (someone)" },
      { ar: "كَلَّمَ (شَخصًا) عَن / في (مَوضوع)", en: "spoke to (someone) about (a topic)" },
    ],
    mistakes: [],
  },

  "حكم": {
    level_1: { ar: "حَكَمَ القاضي بِالعَدلِ.", en: "The judge ruled with justice." },
    level_2: { ar: "حَكَمَتِ المَحكَمَةُ عَلى المُتَّهَمِ بِالسِّجنِ.", en: "The court sentenced the accused to prison." },
    level_3: { ar: "حَكَمَ البِلادَ عَقدَينِ مُتَّبِعًا سِياسَةً اقتِصادِيَّةً مَركَزِيَّةً.", en: "He ruled the country for two decades following a centralized economic policy." },
    patterns: [
      { ar: "حَكَمَ (بِلادًا)", en: "ruled / governed (a country)" },
      { ar: "حَكَمَ عَلى (شَخص) بِ (عُقوبَة)", en: "sentenced (someone) to (a punishment)" },
      { ar: "حَكَمَ بِ (قَرار)", en: "ruled / judged with (a verdict)" },
    ],
    mistakes: [],
  },

  "ترك": {
    level_1: { ar: "تَرَكَ البَيتَ.", en: "He left the house." },
    level_2: { ar: "تَرَكَ العَمَلَ بَعدَ عَشرِ سَنَواتٍ.", en: "He left his job after ten years." },
    level_3: { ar: "تَرَكَتِ الحَربُ آثارًا عَميقَةً في البُنيَةِ التَّحتِيَّةِ وَالنَّسيجِ الاجتِماعِيِّ.", en: "The war left deep marks on the infrastructure and social fabric." },
    patterns: [
      { ar: "تَرَكَ (شَيئًا / شَخصًا)", en: "left / abandoned (something / someone)" },
      { ar: "تَرَكَ (شَخصًا) يَفعَلُ ...", en: "let (someone) do ..." },
    ],
    mistakes: [],
  },

  "قدم": {
    level_1: { ar: "قَدَّمَ الهَدِيَّةَ.", en: "He presented the gift." },
    level_2: { ar: "قَدَّمَ المُوَظَّفُ تَقريرَهُ إِلى المُديرِ.", en: "The employee submitted his report to the manager." },
    level_3: { ar: "قَدَّمَتِ المُنَظَّمَةُ مُقتَرَحًا شامِلًا لِإِصلاحِ النِّظامِ التَّعليمِيِّ.", en: "The organization submitted a comprehensive proposal for reforming the educational system." },
    patterns: [
      { ar: "قَدَّمَ (شَيئًا) لِ / إِلى (شَخص)", en: "presented / submitted (something) to (someone)" },
      { ar: "قَدَّمَ عَلى (شَيء)", en: "applied for (something)" },
    ],
    mistakes: [],
  },

  "ظهر": {
    level_1: { ar: "ظَهَرَ القَمَرُ.", en: "The moon appeared." },
    level_2: { ar: "ظَهَرَتِ النَّتائِجُ بَعدَ أُسبوعٍ.", en: "The results appeared after a week." },
    level_3: { ar: "ظَهَرَت دِراسَةٌ حَديثَةٌ تُشيرُ إِلى تَراجُعِ مُعَدَّلاتِ القِراءَةِ بَينَ الشَّبابِ.", en: "A recent study appeared indicating a decline in reading rates among youth." },
    patterns: [
      { ar: "ظَهَرَ (شَيءٌ / شَخصٌ)", en: "appeared (something / someone)" },
      { ar: "ظَهَرَ أَنَّ ...", en: "it appeared / turned out that ..." },
    ],
    mistakes: [],
  },

  "نقل": {
    level_1: { ar: "نَقَلَ الأَثاثَ.", en: "He moved the furniture." },
    level_2: { ar: "نَقَلَتِ الشَّرِكَةُ البَضائِعَ إِلى المَخزَنِ.", en: "The company transported the goods to the warehouse." },
    level_3: { ar: "نَقَلَ المُراسِلُ الأَحداثَ مُباشَرَةً مِن قَلبِ العاصِمَةِ.", en: "The correspondent reported the events live from the heart of the capital." },
    patterns: [
      { ar: "نَقَلَ (شَيئًا) إِلى / مِن (مَكان)", en: "transferred / moved (something) to / from (a place)" },
      { ar: "نَقَلَ (خَبَرًا) عَن (مَصدَر)", en: "reported (news) from (a source)" },
    ],
    mistakes: [],
  },

  "وصل": {
    level_1: { ar: "وَصَلَ إِلى المَدرَسَةِ.", en: "He arrived at school." },
    level_2: { ar: "وَصَلَتِ الطّائِرَةُ في مَوعِدِها.", en: "The plane arrived on time." },
    level_3: { ar: "وَصَلَتِ المُفاوَضاتُ إِلى مَرحَلَةٍ حَرِجَةٍ تَتَطَلَّبُ قَراراتٍ حاسِمَةً.", en: "The negotiations reached a critical stage requiring decisive decisions." },
    patterns: [
      { ar: "وَصَلَ إِلى (مَكان / نَتيجَة)", en: "arrived at / reached (a place / result)" },
      { ar: "وَصَلَ (شَخصًا)", en: "connected / reached (someone)" },
    ],
    mistakes: [
      { wrong_ar: "وَصَلَ المَدرَسَةَ", right_ar: "وَصَلَ إِلى المَدرَسَةِ", note_en: "When meaning 'arrive', وَصَلَ requires إِلى. A direct object means 'connected'." },
    ],
  },

  "بدأ": {
    level_1: { ar: "بَدَأَ العَمَلَ.", en: "He started the work." },
    level_2: { ar: "بَدَأَ الطَّالِبُ يَدرُسُ اللُّغَةَ العَرَبِيَّةَ.", en: "The student started studying Arabic." },
    level_3: { ar: "بَدَأَتِ الحُكومَةُ تَنفيذَ خُطَّةِ الإِصلاحِ الاقتِصادِيِّ عَلى مَراحِلَ.", en: "The government began implementing the economic reform plan in stages." },
    patterns: [
      { ar: "بَدَأَ (شَيئًا)", en: "started (something)" },
      { ar: "بَدَأَ يَفعَلُ / بِفِعلِ ...", en: "started doing / to do ..." },
      { ar: "بَدَأَ مِن (نُقطَة)", en: "started from (a point)" },
    ],
    mistakes: [],
  },

  "حمل": {
    level_1: { ar: "حَمَلَ الحَقيبَةَ.", en: "He carried the bag." },
    level_2: { ar: "حَمَلَ الجُندِيُّ سِلاحَهُ وَسارَ.", en: "The soldier carried his weapon and marched." },
    level_3: { ar: "حَمَلَتِ الرِّسالَةُ في طَيّاتِها تَحذيرًا صَريحًا مِنَ العَواقِبِ المُحتَمَلَةِ.", en: "The letter carried within it an explicit warning of potential consequences." },
    patterns: [
      { ar: "حَمَلَ (شَيئًا)", en: "carried (something)" },
      { ar: "حَمَلَ عَلى (عَدُوّ)", en: "attacked / charged at (an enemy)" },
    ],
    mistakes: [],
  },

  "قتل": {
    level_1: { ar: "قَتَلَ الحَشَرَةَ.", en: "He killed the insect." },
    level_2: { ar: "قَتَلَ الصَّيّادُ الأَسَدَ.", en: "The hunter killed the lion." },
    level_3: { ar: "قَتَلَ الجَهلُ أُمَمًا أَكثَرَ مِمّا قَتَلَتِ الحُروبُ.", en: "Ignorance killed more nations than wars did." },
    patterns: [
      { ar: "قَتَلَ (شَخصًا / شَيئًا)", en: "killed (someone / something)" },
    ],
    mistakes: [],
  },

  "رأى": {
    level_1: { ar: "رَأى الطّائِرَ.", en: "He saw the bird." },
    level_2: { ar: "رَأَتِ الأُمُّ ابنَها يَلعَبُ في الحَديقَةِ.", en: "The mother saw her son playing in the park." },
    level_3: { ar: "رَأى المُحَلِّلونَ أَنَّ الأَسواقَ سَتَشهَدُ تَحَسُّنًا تَدريجِيًّا.", en: "Analysts saw that markets would see a gradual improvement." },
    patterns: [
      { ar: "رَأى (شَيئًا / شَخصًا)", en: "saw (something / someone)" },
      { ar: "رَأى أَنَّ ...", en: "was of the opinion that ..." },
    ],
    mistakes: [],
  },

  "صدق": {
    level_1: { ar: "صَدَقَ في كَلامِهِ.", en: "He was truthful in his words." },
    level_2: { ar: "صَدَقَ الرَّجُلُ الوَعدَ وَجاءَ في المَوعِدِ.", en: "The man kept his promise and came on time." },
    level_3: { ar: "صَدَقَتِ التَّوَقُّعاتُ بِشَأنِ نَتائِجِ الانتِخاباتِ البَرلَمانِيَّةِ.", en: "The predictions about the parliamentary election results proved true." },
    patterns: [
      { ar: "صَدَقَ في (أَمر)", en: "was truthful in (a matter)" },
      { ar: "صَدَقَ (شَخصًا)", en: "believed (someone)" },
    ],
    mistakes: [],
  },

  "حضر": {
    level_1: { ar: "حَضَرَ الاجتِماعَ.", en: "He attended the meeting." },
    level_2: { ar: "حَضَرَ جَميعُ المُوَظَّفينَ الحَفلَ السَّنَوِيَّ.", en: "All employees attended the annual ceremony." },
    level_3: { ar: "حَضَرَ المُؤتَمَرَ مُمَثِّلونَ عَنِ اثنَتَي عَشرَةَ دَولَةً.", en: "Representatives from twelve countries attended the conference." },
    patterns: [
      { ar: "حَضَرَ (مُناسَبَة / اجتِماع)", en: "attended (an event / meeting)" },
      { ar: "حَضَرَ إِلى (مَكان)", en: "came to (a place)" },
    ],
    mistakes: [],
  },

  "نام": {
    level_1: { ar: "نامَ الطِّفلُ.", en: "The child slept." },
    level_2: { ar: "نامَ الرَّجُلُ مُبَكِّرًا لِأَنَّهُ كانَ مُتعَبًا.", en: "The man slept early because he was tired." },
    level_3: { ar: "نامَ المُسافِرونَ في المَطارِ بَعدَ إِلغاءِ رِحلَتِهِم.", en: "The travelers slept at the airport after their flight was cancelled." },
    patterns: [
      { ar: "نامَ (بِدونِ مَفعول)", en: "slept (intransitive)" },
      { ar: "نامَ عَن (شَيء)", en: "overslept / missed (something)" },
    ],
    mistakes: [],
  },

  "مشى": {
    level_1: { ar: "مَشى إِلى المَدرَسَةِ.", en: "He walked to school." },
    level_2: { ar: "مَشَتِ العائِلَةُ عَلى الشّاطِئِ عِندَ الغُروبِ.", en: "The family walked on the beach at sunset." },
    level_3: { ar: "مَشَتِ المُفاوَضاتُ بِبُطءٍ بِسَبَبِ الخِلافاتِ الجَوهَرِيَّةِ بَينَ الأَطرافِ.", en: "The negotiations progressed slowly due to fundamental disagreements between the parties." },
    patterns: [
      { ar: "مَشى إِلى (مَكان)", en: "walked to (a place)" },
      { ar: "مَشى عَلى (سَطح)", en: "walked on (a surface)" },
    ],
    mistakes: [],
  },

  "رمى": {
    level_1: { ar: "رَمى الكُرَةَ.", en: "He threw the ball." },
    level_2: { ar: "رَمى اللّاعِبُ الكُرَةَ نَحوَ المَرمى.", en: "The player threw the ball toward the goal." },
    level_3: { ar: "رَمَتِ المَعارِضَةُ الحُكومَةَ بِالتَّقصيرِ في إِدارَةِ الأَزمَةِ.", en: "The opposition accused the government of failing in managing the crisis." },
    patterns: [
      { ar: "رَمى (شَيئًا)", en: "threw (something)" },
      { ar: "رَمى (شَخصًا) بِ (شَيء)", en: "threw (something) at (someone); also: accused of" },
    ],
    mistakes: [],
  },

  "جاء": {
    level_1: { ar: "جاءَ الوَلَدُ.", en: "The boy came." },
    level_2: { ar: "جاءَ المُعَلِّمُ إِلى الصَّفِّ مُبَكِّرًا.", en: "The teacher came to class early." },
    level_3: { ar: "جاءَ القَرارُ مُتَأَخِّرًا وَلَم يُعالِج جَوهَرَ المُشكِلَةِ.", en: "The decision came late and did not address the core of the problem." },
    patterns: [
      { ar: "جاءَ (شَخصٌ / شَيءٌ)", en: "came (someone / something)" },
      { ar: "جاءَ بِ (شَيء)", en: "brought (something)" },
      { ar: "جاءَ مِن (مَكان)", en: "came from (a place)" },
    ],
    mistakes: [
      { wrong_ar: "جاءَ لِلبَيتِ", right_ar: "جاءَ إِلى البَيتِ", note_en: "Use إِلى for destination, not لِ." },
    ],
  },

  "سقط": {
    level_1: { ar: "سَقَطَ الكِتابُ.", en: "The book fell." },
    level_2: { ar: "سَقَطَتِ الأَمطارُ بِغَزارَةٍ.", en: "Rain fell heavily." },
    level_3: { ar: "سَقَطَ النِّظامُ بَعدَ أَشهُرٍ مِنَ الاحتِجاجاتِ الشَّعبِيَّةِ.", en: "The regime fell after months of popular protests." },
    patterns: [
      { ar: "سَقَطَ (شَيءٌ)", en: "fell (something — intransitive)" },
      { ar: "سَقَطَ في (مَكان / خَطَأ)", en: "fell into (a place / mistake)" },
    ],
    mistakes: [],
  },

  "وقف": {
    level_1: { ar: "وَقَفَ أَمامَ البابِ.", en: "He stood in front of the door." },
    level_2: { ar: "وَقَفَ الجُمهورُ تَحِيَّةً لِلفَريقِ.", en: "The audience stood in salute to the team." },
    level_3: { ar: "وَقَفَ المُجتَمَعُ الدَّولِيُّ عاجِزًا أَمامَ تَصاعُدِ الأَزمَةِ الإِنسانِيَّةِ.", en: "The international community stood helpless in the face of the escalating humanitarian crisis." },
    patterns: [
      { ar: "وَقَفَ (بِدونِ مَفعول)", en: "stood (intransitive)" },
      { ar: "وَقَفَ عَلى (حَقيقَة)", en: "discovered / realized (a truth)" },
      { ar: "وَقَفَ ضِدَّ / مَعَ (شَخص / أَمر)", en: "stood against / with (someone / a matter)" },
    ],
    mistakes: [],
  },

  "شكر": {
    level_1: { ar: "شَكَرَ المُعَلِّمَ.", en: "He thanked the teacher." },
    level_2: { ar: "شَكَرَتِ الأُمُّ الطَّبيبَ عَلى مُساعَدَتِهِ.", en: "The mother thanked the doctor for his help." },
    level_3: { ar: "شَكَرَ الرَّئيسُ الدُّوَلَ المانِحَةَ عَلى دَعمِها السَّخِيِّ في مَرحَلَةِ إِعادَةِ الإِعمارِ.", en: "The president thanked the donor countries for their generous support in the reconstruction phase." },
    patterns: [
      { ar: "شَكَرَ (شَخصًا)", en: "thanked (someone)" },
      { ar: "شَكَرَ (شَخصًا) عَلى (شَيء)", en: "thanked (someone) for (something)" },
    ],
    mistakes: [],
  },

  "بحث": {
    level_1: { ar: "بَحَثَ عَنِ الكِتابِ.", en: "He searched for the book." },
    level_2: { ar: "بَحَثَ الطَّالِبُ عَن مَعلوماتٍ في الإِنتَرنِت.", en: "The student searched for information on the internet." },
    level_3: { ar: "بَحَثَ المُؤتَمَرُ في سُبُلِ تَعزيزِ التَّعاوُنِ الاقتِصادِيِّ بَينَ البُلدانِ النّامِيَةِ.", en: "The conference discussed ways to strengthen economic cooperation among developing countries." },
    patterns: [
      { ar: "بَحَثَ عَن (شَيء)", en: "searched for (something)" },
      { ar: "بَحَثَ في (مَوضوع)", en: "researched / discussed (a topic)" },
    ],
    mistakes: [
      { wrong_ar: "بَحَثَ الكِتابَ", right_ar: "بَحَثَ عَنِ الكِتابِ", note_en: "بَحَثَ requires عَن for searching. بَحَثَ في means 'researched/discussed'." },
    ],
  },

  "وضع": {
    level_1: { ar: "وَضَعَ الكِتابَ عَلى الطّاوِلَةِ.", en: "He put the book on the table." },
    level_2: { ar: "وَضَعَتِ الشَّرِكَةُ خُطَّةً جَديدَةً لِلتَّسويقِ.", en: "The company set a new marketing plan." },
    level_3: { ar: "وَضَعَ المُشَرِّعونَ إِطارًا قانونِيًّا يَضمَنُ حِمايَةَ حُقوقِ المُلكِيَّةِ الفِكرِيَّةِ.", en: "Legislators established a legal framework ensuring the protection of intellectual property rights." },
    patterns: [
      { ar: "وَضَعَ (شَيئًا) في / عَلى (مَكان)", en: "put / placed (something) in / on (a place)" },
      { ar: "وَضَعَ (خُطَّة / قانون)", en: "set / established (a plan / law)" },
    ],
    mistakes: [],
  },

  "سكن": {
    level_1: { ar: "سَكَنَ في بَيتٍ صَغيرٍ.", en: "He lived in a small house." },
    level_2: { ar: "سَكَنَتِ العائِلَةُ في المَدينَةِ عَشرَ سَنَواتٍ.", en: "The family lived in the city for ten years." },
    level_3: { ar: "سَكَنَ الخَوفُ قَلبَ المُواطِنينَ بَعدَ أَنباءِ الزِّلزالِ.", en: "Fear settled in the hearts of the citizens after the earthquake reports." },
    patterns: [
      { ar: "سَكَنَ في (مَكان)", en: "lived / resided in (a place)" },
      { ar: "سَكَنَ (شَيءٌ)", en: "(something) settled / calmed" },
    ],
    mistakes: [],
  },

  "نشر": {
    level_1: { ar: "نَشَرَ الخَبَرَ.", en: "He published the news." },
    level_2: { ar: "نَشَرَتِ الصَّحيفَةُ تَقريرًا عَنِ التَّعليمِ.", en: "The newspaper published a report on education." },
    level_3: { ar: "نَشَرَ المَركَزُ البَحثِيُّ دِراسَةً حَولَ تَأثيرِ الذَّكاءِ الاصطِناعِيِّ عَلى سوقِ العَمَلِ.", en: "The research center published a study on the impact of artificial intelligence on the labor market." },
    patterns: [
      { ar: "نَشَرَ (مَقال / كِتاب / خَبَر)", en: "published (an article / book / news)" },
      { ar: "نَشَرَ (شَيئًا) في (وَسيلَة)", en: "published (something) in (a medium)" },
    ],
    mistakes: [],
  },

  "رسم": {
    level_1: { ar: "رَسَمَ صورَةً.", en: "He drew a picture." },
    level_2: { ar: "رَسَمَ الطِّفلُ بَيتًا وَشَجَرَةً.", en: "The child drew a house and a tree." },
    level_3: { ar: "رَسَمَتِ الحُكومَةُ مَلامِحَ سِياسَتِها الخارِجِيَّةِ لِلمَرحَلَةِ القادِمَةِ.", en: "The government outlined the features of its foreign policy for the coming phase." },
    patterns: [
      { ar: "رَسَمَ (شَيئًا)", en: "drew / outlined (something)" },
      { ar: "رَسَمَ خُطَّةً / سِياسَةً", en: "drew up a plan / policy (figurative)" },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 2 — 25 verbs (freq 1, high-value)
  // ═══════════════════════════════════════════════

  "نصر": {
    level_1: { ar: "نَصَرَ صَديقَهُ.", en: "He helped his friend." },
    level_2: { ar: "نَصَرَ الجَيشُ المَدينَةَ مِنَ الهُجومِ.", en: "The army defended the city from the attack." },
    level_3: { ar: "نَصَرَ الشَّعبُ قَضِيَّتَهُ العادِلَةَ بِالصُّمودِ وَالتَّضحِيَةِ.", en: "The people supported their just cause through steadfastness and sacrifice." },
    patterns: [
      { ar: "نَصَرَ (شَخصًا / قَضِيَّة)", en: "helped / supported (someone / a cause)" },
      { ar: "نَصَرَ عَلى (عَدُوّ)", en: "gave victory over (an enemy)" },
    ],
    mistakes: [],
  },

  "ذكر": {
    level_1: { ar: "ذَكَرَ اسمَهُ.", en: "He mentioned his name." },
    level_2: { ar: "ذَكَرَ المُعَلِّمُ القاعِدَةَ مَرَّتَينِ.", en: "The teacher mentioned the rule twice." },
    level_3: { ar: "ذَكَرَ التَّقريرُ أَنَّ مُعَدَّلاتِ البَطالَةِ انخَفَضَت بِنِسبَةِ ثَلاثَةٍ بِالمِئَةِ.", en: "The report mentioned that unemployment rates decreased by three percent." },
    patterns: [
      { ar: "ذَكَرَ (شَيئًا / شَخصًا)", en: "mentioned (something / someone)" },
      { ar: "ذَكَرَ أَنَّ ...", en: "mentioned that ..." },
    ],
    mistakes: [],
  },

  "بلغ": {
    level_1: { ar: "بَلَغَ المَكانَ.", en: "He reached the place." },
    level_2: { ar: "بَلَغَ عَدَدُ الطُّلّابِ مِئَةً.", en: "The number of students reached one hundred." },
    level_3: { ar: "بَلَغَتِ الخَسائِرُ الاقتِصادِيَّةُ مُستَوىً غَيرَ مَسبوقٍ بَعدَ الأَزمَةِ.", en: "Economic losses reached an unprecedented level after the crisis." },
    patterns: [
      { ar: "بَلَغَ (مَكانًا / مَبلَغًا)", en: "reached (a place / an amount)" },
      { ar: "بَلَغَ (شَخصًا) أَنَّ ...", en: "it reached (someone) that ... / was informed" },
    ],
    mistakes: [
      { wrong_ar: "بَلَغَ إِلى المَكانِ", right_ar: "بَلَغَ المَكانَ", note_en: "بَلَغَ takes a direct object; no need for إلى." },
    ],
  },

  "خلق": {
    level_1: { ar: "خَلَقَ اللهُ الإِنسانَ.", en: "God created man." },
    level_2: { ar: "خَلَقَ الفَنّانُ لَوحَةً رائِعَةً.", en: "The artist created a wonderful painting." },
    level_3: { ar: "خَلَقَتِ السِّياساتُ الجَديدَةُ فُرَصًا اقتِصادِيَّةً لِلشَّبابِ.", en: "The new policies created economic opportunities for young people." },
    patterns: [
      { ar: "خَلَقَ (شَيئًا)", en: "created (something)" },
      { ar: "خَلَقَ (شَيئًا) مِن (مادَّة)", en: "created (something) from (a material)" },
    ],
    mistakes: [],
  },

  "عبر": {
    level_1: { ar: "عَبَرَ الشّارِعَ.", en: "He crossed the street." },
    level_2: { ar: "عَبَرَ المُسافِرُ الحُدودَ صَباحًا.", en: "The traveler crossed the border in the morning." },
    level_3: { ar: "عَبَرَ المُتَحَدِّثُ عَن قَلَقِهِ إِزاءَ تَراجُعِ مُستَوى التَّعليمِ.", en: "The speaker expressed his concern about the decline in education standards." },
    patterns: [
      { ar: "عَبَرَ (مَكانًا)", en: "crossed (a place)" },
      { ar: "عَبَرَ عَن (شُعور / رَأي)", en: "expressed (a feeling / opinion)" },
    ],
    mistakes: [
      { wrong_ar: "عَبَرَ مِنَ الشّارِعِ", right_ar: "عَبَرَ الشّارِعَ", note_en: "When meaning 'crossed', عَبَرَ takes a direct object." },
    ],
  },

  "نفذ": {
    level_1: { ar: "نَفَذَ الأَمرَ.", en: "He carried out the order." },
    level_2: { ar: "نَفَذَتِ الشُّرطَةُ الخُطَّةَ الأَمنِيَّةَ.", en: "The police carried out the security plan." },
    level_3: { ar: "نَفَذَتِ الوِزارَةُ مَشروعًا تَنمَوِيًّا يَستَهدِفُ المَناطِقَ الرّيفِيَّةَ.", en: "The ministry implemented a development project targeting rural areas." },
    patterns: [
      { ar: "نَفَذَ (أَمرًا / خُطَّة)", en: "carried out / implemented (an order / plan)" },
      { ar: "نَفَذَ إِلى (مَكان)", en: "penetrated to (a place)" },
    ],
    mistakes: [],
  },

  "حدث": {
    level_1: { ar: "حَدَثَ شَيءٌ غَريبٌ.", en: "Something strange happened." },
    level_2: { ar: "حَدَثَتْ مُشكِلَةٌ في الجِهازِ أَثناءَ العَمَلِ.", en: "A problem occurred in the machine during work." },
    level_3: { ar: "حَدَثَ تَحَوُّلٌ جَذرِيٌّ في السِّياسَةِ الخارِجِيَّةِ بَعدَ تَغيُّرِ القِيادَةِ.", en: "A radical shift in foreign policy occurred after the change of leadership." },
    patterns: [
      { ar: "حَدَثَ (شَيءٌ)", en: "happened / occurred (something)" },
      { ar: "حَدَثَ أَنْ ...", en: "it happened that ..." },
    ],
    mistakes: [],
  },

  "عقد": {
    level_1: { ar: "عَقَدَ اجتِماعًا.", en: "He held a meeting." },
    level_2: { ar: "عَقَدَتِ المَدرَسَةُ حَفلًا في نِهايَةِ العامِ.", en: "The school held a ceremony at the end of the year." },
    level_3: { ar: "عَقَدَتِ الدَّولَتانِ اتِّفاقِيَّةً لِلتَّعاوُنِ في مَجالِ الطّاقَةِ المُتَجَدِّدَةِ.", en: "The two countries concluded an agreement for cooperation in renewable energy." },
    patterns: [
      { ar: "عَقَدَ (اجتِماعًا / اتِّفاقًا)", en: "held / concluded (a meeting / agreement)" },
      { ar: "عَقَدَ العَزمَ عَلى ...", en: "resolved / determined to ..." },
    ],
    mistakes: [],
  },

  "ضرب": {
    level_1: { ar: "ضَرَبَ الكُرَةَ.", en: "He hit the ball." },
    level_2: { ar: "ضَرَبَ المُعَلِّمُ مَثَلًا لِلطُّلّابِ.", en: "The teacher gave the students an example." },
    level_3: { ar: "ضَرَبَ الزِّلزالُ المِنطَقَةَ فَجرًا مُخَلِّفًا دَمارًا واسِعًا.", en: "The earthquake struck the area at dawn, leaving widespread destruction." },
    patterns: [
      { ar: "ضَرَبَ (شَيئًا / شَخصًا)", en: "hit / struck (something / someone)" },
      { ar: "ضَرَبَ مَثَلًا", en: "gave an example" },
      { ar: "ضَرَبَ مَوعِدًا", en: "set an appointment" },
    ],
    mistakes: [],
  },

  "نزل": {
    level_1: { ar: "نَزَلَ مِنَ السَّيّارَةِ.", en: "He got out of the car." },
    level_2: { ar: "نَزَلَ المَطَرُ بِغَزارَةٍ.", en: "Rain came down heavily." },
    level_3: { ar: "نَزَلَتِ القُوّاتُ إِلى الشَّوارِعِ لِحِفظِ النِّظامِ بَعدَ الأَحداثِ.", en: "Forces went down to the streets to maintain order after the events." },
    patterns: [
      { ar: "نَزَلَ مِن (مَكان)", en: "came down from / got out of (a place)" },
      { ar: "نَزَلَ في (فُندُق / مَكان)", en: "stayed at (a hotel / place)" },
      { ar: "نَزَلَ إِلى (مَكان)", en: "went down to (a place)" },
    ],
    mistakes: [
      { wrong_ar: "نَزَلَ السَّيّارَةَ", right_ar: "نَزَلَ مِنَ السَّيّارَةِ", note_en: "نَزَلَ is intransitive; use مِن for the place exited." },
    ],
  },

  "كسب": {
    level_1: { ar: "كَسَبَ مالًا.", en: "He earned money." },
    level_2: { ar: "كَسَبَ الفَريقُ المُباراةَ.", en: "The team won the match." },
    level_3: { ar: "كَسَبَتِ الشَّرِكَةُ ثِقَةَ العُمَلاءِ بِفَضلِ جَودَةِ خَدَماتِها.", en: "The company earned customers' trust thanks to the quality of its services." },
    patterns: [
      { ar: "كَسَبَ (مالًا / ثِقَة)", en: "earned / gained (money / trust)" },
    ],
    mistakes: [],
  },

  "غفر": {
    level_1: { ar: "غَفَرَ لَهُ خَطَأَهُ.", en: "He forgave him his mistake." },
    level_2: { ar: "غَفَرَتِ الأُمُّ لِابنِها بَعدَ اعتِذارِهِ.", en: "The mother forgave her son after his apology." },
    level_3: { ar: "غَفَرَ لَهُ المُجتَمَعُ زَلّاتِهِ بَعدَ أَن أَثبَتَ حُسنَ نِيَّتِهِ.", en: "Society forgave him his lapses after he proved his good intentions." },
    patterns: [
      { ar: "غَفَرَ لِ (شَخص)", en: "forgave (someone)" },
      { ar: "غَفَرَ (ذَنبًا)", en: "forgave (a sin / fault)" },
    ],
    mistakes: [
      { wrong_ar: "غَفَرَ عَنهُ", right_ar: "غَفَرَ لَهُ", note_en: "Use لِ not عَن with غَفَرَ for the person forgiven." },
    ],
  },

  "صبر": {
    level_1: { ar: "صَبَرَ عَلى الأَلَمِ.", en: "He endured the pain." },
    level_2: { ar: "صَبَرَتِ المَرأَةُ عَلى المَشاقِّ سَنَواتٍ طَويلَةً.", en: "The woman endured hardships for many years." },
    level_3: { ar: "صَبَرَ الشَّعبُ عَلى الظُّروفِ الصَّعبَةِ حَتّى تَحَقَّقَتِ المَطالِبُ.", en: "The people endured the difficult circumstances until the demands were met." },
    patterns: [
      { ar: "صَبَرَ عَلى (شَيء)", en: "was patient with / endured (something)" },
      { ar: "صَبَرَ عَن (شَيء)", en: "abstained patiently from (something)" },
    ],
    mistakes: [],
  },

  "خدم": {
    level_1: { ar: "خَدَمَ الضُّيوفَ.", en: "He served the guests." },
    level_2: { ar: "خَدَمَ في الجَيشِ خَمسَ سَنَواتٍ.", en: "He served in the army for five years." },
    level_3: { ar: "خَدَمَ المَشروعُ الجَديدُ مَصالِحَ المُجتَمَعِ المَحَلِّيِّ.", en: "The new project served the interests of the local community." },
    patterns: [
      { ar: "خَدَمَ (شَخصًا / مَصلَحَة)", en: "served (someone / an interest)" },
      { ar: "خَدَمَ في (مَكان / مَجال)", en: "served in (a place / field)" },
    ],
    mistakes: [],
  },

  "شرح": {
    level_1: { ar: "شَرَحَ الدَّرسَ.", en: "He explained the lesson." },
    level_2: { ar: "شَرَحَ المُعَلِّمُ القاعِدَةَ بِطَريقَةٍ بَسيطَةٍ.", en: "The teacher explained the rule in a simple way." },
    level_3: { ar: "شَرَحَ الخَبيرُ الأَبعادَ القانونِيَّةَ لِلقَضِيَّةِ أَمامَ لَجنَةِ التَّحقيقِ.", en: "The expert explained the legal dimensions of the case before the investigation committee." },
    patterns: [
      { ar: "شَرَحَ (شَيئًا) لِ (شَخص)", en: "explained (something) to (someone)" },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 3 — 25 verbs (weak verbs + classroom)
  // ═══════════════════════════════════════════════

  "خاف": {
    level_1: { ar: "خافَ مِنَ الظَّلامِ.", en: "He was afraid of the dark." },
    level_2: { ar: "خافَ الطِّفلُ مِنَ الكَلبِ الكَبيرِ.", en: "The child was afraid of the big dog." },
    level_3: { ar: "خافَ المُستَثمِرونَ مِن تَراجُعِ قيمَةِ العُملَةِ في الأَسواقِ.", en: "Investors feared a decline in the currency's value in the markets." },
    patterns: [
      { ar: "خافَ مِن (شَيء / شَخص)", en: "feared / was afraid of (something / someone)" },
      { ar: "خافَ عَلى (شَخص / شَيء)", en: "feared for (someone / something)" },
    ],
    mistakes: [
      { wrong_ar: "خافَ الظَّلامَ", right_ar: "خافَ مِنَ الظَّلامِ", note_en: "خافَ typically requires مِن for what is feared." },
    ],
  },

  "زار": {
    level_1: { ar: "زارَ صَديقَهُ.", en: "He visited his friend." },
    level_2: { ar: "زارَتِ العائِلَةُ المَتحَفَ يَومَ السَّبتِ.", en: "The family visited the museum on Saturday." },
    level_3: { ar: "زارَ الوَفدُ الدِّبلوماسِيُّ العاصِمَةَ لِبَحثِ سُبُلِ التَّعاوُنِ الثُّنائِيِّ.", en: "The diplomatic delegation visited the capital to discuss bilateral cooperation." },
    patterns: [
      { ar: "زارَ (شَخصًا / مَكانًا)", en: "visited (someone / a place)" },
    ],
    mistakes: [],
  },

  "عاش": {
    level_1: { ar: "عاشَ في القاهِرَةِ.", en: "He lived in Cairo." },
    level_2: { ar: "عاشَتِ الجَدَّةُ حَياةً طَويلَةً وَسَعيدَةً.", en: "The grandmother lived a long and happy life." },
    level_3: { ar: "عاشَتِ المِنطَقَةُ فَترَةً مِنَ الاستِقرارِ بَعدَ تَوقيعِ اتِّفاقِيَّةِ السَّلامِ.", en: "The region experienced a period of stability after the signing of the peace agreement." },
    patterns: [
      { ar: "عاشَ في (مَكان)", en: "lived in (a place)" },
      { ar: "عاشَ (حَياة / فَترَة)", en: "lived / experienced (a life / period)" },
    ],
    mistakes: [],
  },

  "صام": {
    level_1: { ar: "صامَ يَومًا.", en: "He fasted for a day." },
    level_2: { ar: "صامَ المُسلِمونَ شَهرَ رَمَضانَ.", en: "Muslims fasted the month of Ramadan." },
    level_3: { ar: "صامَ عَنِ الكَلامِ احتِجاجًا عَلى القَرارِ.", en: "He refrained from speaking in protest against the decision." },
    patterns: [
      { ar: "صامَ (يَومًا / شَهرًا)", en: "fasted (a day / month)" },
      { ar: "صامَ عَن (شَيء)", en: "abstained from (something)" },
    ],
    mistakes: [],
  },

  "قاد": {
    level_1: { ar: "قادَ السَّيّارَةَ.", en: "He drove the car." },
    level_2: { ar: "قادَ الجَيشَ إِلى النَّصرِ.", en: "He led the army to victory." },
    level_3: { ar: "قادَتِ المُديرَةُ الفَريقَ بِكَفاءَةٍ خِلالَ الأَزمَةِ المالِيَّةِ.", en: "The director led the team efficiently during the financial crisis." },
    patterns: [
      { ar: "قادَ (شَيئًا / شَخصًا)", en: "led / drove (something / someone)" },
      { ar: "قادَ إِلى (نَتيجَة)", en: "led to (a result)" },
    ],
    mistakes: [],
  },

  "باع": {
    level_1: { ar: "باعَ البَيتَ.", en: "He sold the house." },
    level_2: { ar: "باعَ التّاجِرُ البَضاعَةَ بِسِعرٍ مُنخَفِضٍ.", en: "The merchant sold the goods at a low price." },
    level_3: { ar: "باعَتِ الشَّرِكَةُ حِصَّتَها في المَشروعِ لِمُستَثمِرٍ أَجنَبِيٍّ.", en: "The company sold its share in the project to a foreign investor." },
    patterns: [
      { ar: "باعَ (شَيئًا)", en: "sold (something)" },
      { ar: "باعَ (شَيئًا) بِ (ثَمَن)", en: "sold (something) for (a price)" },
      { ar: "باعَ (شَيئًا) لِ / إِلى (شَخص)", en: "sold (something) to (someone)" },
    ],
    mistakes: [],
  },

  "دعا": {
    level_1: { ar: "دَعا صَديقَهُ.", en: "He invited his friend." },
    level_2: { ar: "دَعا الرَّئيسُ إِلى الحِوارِ.", en: "The president called for dialogue." },
    level_3: { ar: "دَعَتِ المُنَظَّمَةُ الدَّولِيَّةُ إِلى وَقفِ إِطلاقِ النّارِ فَورًا.", en: "The international organization called for an immediate ceasefire." },
    patterns: [
      { ar: "دَعا (شَخصًا)", en: "invited (someone)" },
      { ar: "دَعا إِلى (شَيء)", en: "called for / advocated (something)" },
      { ar: "دَعا لِ (شَخص)", en: "prayed for (someone)" },
      { ar: "دَعا عَلى (شَخص)", en: "prayed against / cursed (someone)" },
    ],
    mistakes: [
      { wrong_ar: "دَعا لِلحِوارِ", right_ar: "دَعا إِلى الحِوارِ", note_en: "Use إلى not لِ when meaning 'called for'." },
    ],
  },

  "كان": {
    level_1: { ar: "كانَ سَعيدًا.", en: "He was happy." },
    level_2: { ar: "كانَ الطَّقسُ جَميلًا أَمسِ.", en: "The weather was beautiful yesterday." },
    level_3: { ar: "كانَتِ العَلاقاتُ بَينَ البَلَدَينِ تَمُرُّ بِمَرحَلَةٍ دَقيقَةٍ.", en: "Relations between the two countries were going through a delicate phase." },
    patterns: [
      { ar: "كانَ (صِفَة / اسمًا)", en: "was (adj. / noun) — takes accusative predicate" },
      { ar: "كانَ يَفعَلُ ...", en: "was doing ... (past continuous)" },
    ],
    mistakes: [
      { wrong_ar: "كانَ سَعيدٌ", right_ar: "كانَ سَعيدًا", note_en: "The predicate of كانَ must be accusative (منصوب), not nominative." },
    ],
  },

  "سار": {
    level_1: { ar: "سارَ في الطَّريقِ.", en: "He walked on the road." },
    level_2: { ar: "سارَتِ القافِلَةُ عَبرَ الصَّحراءِ.", en: "The caravan marched across the desert." },
    level_3: { ar: "سارَتِ المُفاوَضاتُ وَفقَ الجَدوَلِ المُحَدَّدِ دونَ عَقَباتٍ.", en: "The negotiations proceeded according to the set schedule without obstacles." },
    patterns: [
      { ar: "سارَ في / عَلى (طَريق)", en: "walked on / along (a road)" },
      { ar: "سارَ (أَمرٌ)", en: "(something) progressed / proceeded" },
    ],
    mistakes: [],
  },

  "شاهد": {
    level_1: { ar: "شاهَدَ الفيلمَ.", en: "He watched the film." },
    level_2: { ar: "شاهَدَ الجُمهورُ المُباراةَ عَلى الشّاشَةِ.", en: "The audience watched the match on screen." },
    level_3: { ar: "شاهَدَ العالَمُ البَثَّ المُباشِرَ لِلحَدَثِ التّاريخِيِّ.", en: "The world watched the live broadcast of the historical event." },
    patterns: [
      { ar: "شاهَدَ (شَيئًا)", en: "watched / witnessed (something)" },
    ],
    mistakes: [],
  },

  "منح": {
    level_1: { ar: "مَنَحَهُ جائِزَةً.", en: "He awarded him a prize." },
    level_2: { ar: "مَنَحَتِ الجامِعَةُ الطَّالِبَ مِنحَةً دِراسِيَّةً.", en: "The university granted the student a scholarship." },
    level_3: { ar: "مَنَحَتِ الحُكومَةُ الشَّبابَ قُروضًا مُيَسَّرَةً لِإِقامَةِ مَشاريعَ صَغيرَةٍ.", en: "The government granted young people facilitated loans to start small projects." },
    patterns: [
      { ar: "مَنَحَ (شَخصًا) (شَيئًا)", en: "granted / gave (someone) (something) — double accusative" },
    ],
    mistakes: [],
  },

  "طرح": {
    level_1: { ar: "طَرَحَ سُؤالًا.", en: "He asked a question." },
    level_2: { ar: "طَرَحَ المُديرُ فِكرَةً جَديدَةً في الاجتِماعِ.", en: "The manager put forward a new idea in the meeting." },
    level_3: { ar: "طَرَحَتِ المُعارَضَةُ مَشروعَ قانونٍ بَديلًا لِلمُناقَشَةِ.", en: "The opposition put forward an alternative bill for discussion." },
    patterns: [
      { ar: "طَرَحَ (سُؤالًا / فِكرَة)", en: "raised / put forward (a question / idea)" },
      { ar: "طَرَحَ (شَيئًا) عَلى (شَخص / جِهَة)", en: "presented (something) to (someone / body)" },
    ],
    mistakes: [],
  },

  "فقد": {
    level_1: { ar: "فَقَدَ مِفتاحَهُ.", en: "He lost his key." },
    level_2: { ar: "فَقَدَتِ الأُسرَةُ مَنزِلَها في الفَيَضانِ.", en: "The family lost their house in the flood." },
    level_3: { ar: "فَقَدَتِ المِنطَقَةُ جُزءًا كَبيرًا مِن غِطائِها الحُرجِيِّ بِسَبَبِ الحَرائِقِ.", en: "The area lost a large part of its forest cover due to fires." },
    patterns: [
      { ar: "فَقَدَ (شَيئًا / شَخصًا)", en: "lost (something / someone)" },
    ],
    mistakes: [],
  },

  "رحم": {
    level_1: { ar: "رَحِمَهُ اللهُ.", en: "May God have mercy on him." },
    level_2: { ar: "رَحِمَ الأَبُ ابنَهُ وَعَفا عَنهُ.", en: "The father had mercy on his son and pardoned him." },
    level_3: { ar: "رَحِمَ القاضي المُتَّهَمَ وَخَفَّفَ الحُكمَ مُراعاةً لِظُروفِهِ.", en: "The judge showed mercy to the accused and reduced the sentence in consideration of his circumstances." },
    patterns: [
      { ar: "رَحِمَ (شَخصًا)", en: "had mercy on (someone)" },
    ],
    mistakes: [],
  },

  "شهد": {
    level_1: { ar: "شَهِدَ الحادِثَ.", en: "He witnessed the incident." },
    level_2: { ar: "شَهِدَتِ المَدينَةُ تَطَوُّرًا كَبيرًا.", en: "The city witnessed great development." },
    level_3: { ar: "شَهِدَ القَرنُ العِشرونَ تَحَوُّلاتٍ جَوهَرِيَّةً في بُنيَةِ النِّظامِ الدَّولِيِّ.", en: "The twentieth century witnessed fundamental transformations in the structure of the international system." },
    patterns: [
      { ar: "شَهِدَ (حَدَثًا)", en: "witnessed (an event)" },
      { ar: "شَهِدَ (مَكانٌ) (تَطَوُّرًا)", en: "(a place) witnessed (development)" },
      { ar: "شَهِدَ أَنَّ ...", en: "testified that ..." },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 4 — 25 verbs (news/formal + assorted)
  // ═══════════════════════════════════════════════

  "صعد": {
    level_1: { ar: "صَعِدَ الدَّرَجَ.", en: "He climbed the stairs." },
    level_2: { ar: "صَعِدَ المُتَسَلِّقُ إِلى قِمَّةِ الجَبَلِ.", en: "The climber ascended to the summit of the mountain." },
    level_3: { ar: "صَعِدَتِ الأَسعارُ بِشَكلٍ مُلفِتٍ بَعدَ الإِعلانِ عَنِ الرُّسومِ الجَديدَةِ.", en: "Prices rose notably after the announcement of the new tariffs." },
    patterns: [
      { ar: "صَعِدَ (دَرَجًا / جَبَلًا)", en: "climbed (stairs / a mountain)" },
      { ar: "صَعِدَ إِلى (مَكان)", en: "ascended to (a place)" },
    ],
    mistakes: [],
  },

  "كره": {
    level_1: { ar: "كَرِهَ الكَذِبَ.", en: "He hated lying." },
    level_2: { ar: "كَرِهَتِ الطِّفلَةُ طَعمَ الدَّواءِ.", en: "The girl hated the taste of the medicine." },
    level_3: { ar: "كَرِهَ النّاسُ الظُّلمَ وَطالَبوا بِتَحقيقِ العَدالَةِ.", en: "People hated injustice and demanded justice." },
    patterns: [
      { ar: "كَرِهَ (شَيئًا / شَخصًا)", en: "hated / disliked (something / someone)" },
      { ar: "كَرِهَ أَن يَفعَلَ ...", en: "hated to do ..." },
    ],
    mistakes: [],
  },

  "لزم": {
    level_1: { ar: "لَزِمَ البَيتَ.", en: "He stayed home." },
    level_2: { ar: "لَزِمَ الصَّبرُ في هَذا المَوقِفِ.", en: "Patience was necessary in this situation." },
    level_3: { ar: "لَزِمَ الطَّبيبُ المُستَشفى طَوالَ فَترَةِ الوَباءِ.", en: "The doctor stayed at the hospital throughout the epidemic period." },
    patterns: [
      { ar: "لَزِمَ (مَكانًا)", en: "stayed at / clung to (a place)" },
      { ar: "لَزِمَ (أَمرٌ)", en: "(something) was necessary" },
    ],
    mistakes: [],
  },

  "حجز": {
    level_1: { ar: "حَجَزَ غُرفَةً.", en: "He booked a room." },
    level_2: { ar: "حَجَزَ تَذكِرَةَ الطّائِرَةِ عَبرَ الإِنتَرنِت.", en: "He booked the plane ticket online." },
    level_3: { ar: "حَجَزَتِ الشُّرطَةُ المُمتَلَكاتِ المَشبوهَةَ بِأَمرٍ مِنَ النِّيابَةِ.", en: "The police seized the suspicious properties by order of the prosecution." },
    patterns: [
      { ar: "حَجَزَ (غُرفَة / تَذكِرَة)", en: "booked / reserved (a room / ticket)" },
      { ar: "حَجَزَ (مُمتَلَكات)", en: "seized / confiscated (properties)" },
    ],
    mistakes: [],
  },

  "فحص": {
    level_1: { ar: "فَحَصَ الطَّبيبُ المَريضَ.", en: "The doctor examined the patient." },
    level_2: { ar: "فَحَصَ المُهَندِسُ الجِهازَ بِعِنايَةٍ.", en: "The engineer examined the device carefully." },
    level_3: { ar: "فَحَصَتِ اللَّجنَةُ جَميعَ الوَثائِقِ المُقَدَّمَةِ قَبلَ إِصدارِ التَّقريرِ.", en: "The committee examined all submitted documents before issuing the report." },
    patterns: [
      { ar: "فَحَصَ (شَخصًا / شَيئًا)", en: "examined / inspected (someone / something)" },
    ],
    mistakes: [],
  },

  "طبخ": {
    level_1: { ar: "طَبَخَ الطَّعامَ.", en: "He cooked the food." },
    level_2: { ar: "طَبَخَتِ الأُمُّ وَجبَةً لَذيذَةً لِلعائِلَةِ.", en: "The mother cooked a delicious meal for the family." },
    level_3: { ar: "طَبَخَ الطّاهي أَطباقًا مُتَنَوِّعَةً مُستَخدِمًا مُكَوِّناتٍ مَحَلِّيَّةً طازَجَةً.", en: "The chef cooked various dishes using fresh local ingredients." },
    patterns: [
      { ar: "طَبَخَ (طَعامًا)", en: "cooked (food)" },
    ],
    mistakes: [],
  },

  "ركض": {
    level_1: { ar: "رَكَضَ بِسُرعَةٍ.", en: "He ran fast." },
    level_2: { ar: "رَكَضَ الطِّفلُ نَحوَ أَبيهِ.", en: "The child ran toward his father." },
    level_3: { ar: "رَكَضَ اللّاعِبونَ في الشَّوطِ الثّاني بِحَماسٍ أَكبَرَ.", en: "The players ran in the second half with greater enthusiasm." },
    patterns: [
      { ar: "رَكَضَ (بِدونِ مَفعول)", en: "ran (intransitive)" },
      { ar: "رَكَضَ نَحوَ / إِلى (مَكان)", en: "ran toward / to (a place)" },
    ],
    mistakes: [],
  },

  "سلك": {
    level_1: { ar: "سَلَكَ الطَّريقَ.", en: "He took the road." },
    level_2: { ar: "سَلَكَ مَسلَكًا جَديدًا في حَياتِهِ.", en: "He took a new path in his life." },
    level_3: { ar: "سَلَكَتِ الحُكومَةُ نَهجًا تَصالُحِيًّا لِحَلِّ الأَزمَةِ.", en: "The government took a conciliatory approach to resolving the crisis." },
    patterns: [
      { ar: "سَلَكَ (طَريقًا / مَسلَكًا)", en: "took / followed (a road / path)" },
    ],
    mistakes: [],
  },

  "نظم": {
    level_1: { ar: "نَظَمَ الكُتُبَ.", en: "He organized the books." },
    level_2: { ar: "نَظَمَتِ المَدرَسَةُ رِحلَةً لِلطُّلّابِ.", en: "The school organized a trip for the students." },
    level_3: { ar: "نَظَمَ المَركَزُ مُؤتَمَرًا دَولِيًّا حَضَرَهُ باحِثونَ مِن عِشرينَ دَولَةً.", en: "The center organized an international conference attended by researchers from twenty countries." },
    patterns: [
      { ar: "نَظَمَ (حَدَثًا / أَشياء)", en: "organized / arranged (an event / things)" },
      { ar: "نَظَمَ (شِعرًا)", en: "composed (poetry)" },
    ],
    mistakes: [],
  },

  "خضع": {
    level_1: { ar: "خَضَعَ لِلفَحصِ.", en: "He underwent the exam." },
    level_2: { ar: "خَضَعَ المَريضُ لِعَمَلِيَّةٍ جِراحِيَّةٍ.", en: "The patient underwent surgery." },
    level_3: { ar: "خَضَعَتِ الشَّرِكَةُ لِتَدقيقٍ مالِيٍّ شامِلٍ بِطَلَبٍ مِنَ الجِهاتِ الرَّقابِيَّةِ.", en: "The company underwent a comprehensive financial audit at the request of regulatory bodies." },
    patterns: [
      { ar: "خَضَعَ لِ (أَمر / فَحص)", en: "submitted to / underwent (a matter / examination)" },
    ],
    mistakes: [
      { wrong_ar: "خَضَعَ الفَحصَ", right_ar: "خَضَعَ لِلفَحصِ", note_en: "خَضَعَ requires لِ; it does not take a direct object." },
    ],
  },

  "عجز": {
    level_1: { ar: "عَجَزَ عَنِ الحَرَكَةِ.", en: "He was unable to move." },
    level_2: { ar: "عَجَزَتِ الشَّرِكَةُ عَن سَدادِ دُيونِها.", en: "The company was unable to pay its debts." },
    level_3: { ar: "عَجَزَتِ المُؤَسَّساتُ عَن مُواكَبَةِ التَّحَوُّلاتِ التِّقنِيَّةِ المُتَسارِعَةِ.", en: "Institutions were unable to keep up with the rapid technological transformations." },
    patterns: [
      { ar: "عَجَزَ عَن (فِعل / شَيء)", en: "was unable / failed to (do / something)" },
    ],
    mistakes: [
      { wrong_ar: "عَجَزَ أَن يَفعَلَ", right_ar: "عَجَزَ عَن أَن يَفعَلَ", note_en: "عَجَزَ requires عَن before the action." },
    ],
  },

  "رحل": {
    level_1: { ar: "رَحَلَ عَنِ البِلادِ.", en: "He departed from the country." },
    level_2: { ar: "رَحَلَ المُسافِرُ إِلى بِلادٍ بَعيدَةٍ.", en: "The traveler departed to faraway lands." },
    level_3: { ar: "رَحَلَ الكاتِبُ الكَبيرُ تارِكًا إِرثًا أَدَبِيًّا خالِدًا.", en: "The great writer passed away leaving an immortal literary legacy." },
    patterns: [
      { ar: "رَحَلَ عَن (مَكان)", en: "departed from (a place)" },
      { ar: "رَحَلَ إِلى (مَكان)", en: "departed to (a place)" },
      { ar: "رَحَلَ (بِمَعنى ماتَ)", en: "passed away (euphemism)" },
    ],
    mistakes: [],
  },

  "جلب": {
    level_1: { ar: "جَلَبَ الماءَ.", en: "He brought water." },
    level_2: { ar: "جَلَبَ التّاجِرُ بَضائِعَ مِنَ الخارِجِ.", en: "The merchant brought goods from abroad." },
    level_3: { ar: "جَلَبَ المَشروعُ استِثماراتٍ أَجنَبِيَّةً بِمَلايينِ الدّولاراتِ.", en: "The project attracted foreign investments worth millions of dollars." },
    patterns: [
      { ar: "جَلَبَ (شَيئًا)", en: "brought / attracted (something)" },
      { ar: "جَلَبَ (شَيئًا) مِن (مَكان)", en: "brought (something) from (a place)" },
    ],
    mistakes: [],
  },

  "فضل": {
    level_1: { ar: "فَضَّلَ القِراءَةَ.", en: "He preferred reading." },
    level_2: { ar: "فَضَّلَتِ الطَّالِبَةُ الدِّراسَةَ في الخارِجِ.", en: "The student (f.) preferred studying abroad." },
    level_3: { ar: "فَضَّلَ المُستَثمِرونَ الأَسواقَ النّاشِئَةَ عَلى الأَسواقِ التَّقليدِيَّةِ.", en: "Investors preferred emerging markets over traditional markets." },
    patterns: [
      { ar: "فَضَّلَ (شَيئًا) عَلى (شَيء)", en: "preferred (something) over (something)" },
    ],
    mistakes: [
      { wrong_ar: "فَضَّلَ القِراءَةَ مِنَ الكِتابَةِ", right_ar: "فَضَّلَ القِراءَةَ عَلى الكِتابَةِ", note_en: "Use عَلى not مِن for 'preferred X over Y'." },
    ],
  },

  "ثبت": {
    level_1: { ar: "ثَبَتَ الخَبَرُ.", en: "The news was confirmed." },
    level_2: { ar: "ثَبَتَ أَنَّ التُّهمَةَ كانَت باطِلَةً.", en: "It was proven that the charge was false." },
    level_3: { ar: "ثَبَتَ عِلمِيًّا أَنَّ النَّومَ الكافي يُحَسِّنُ الأَداءَ الذِّهنِيَّ.", en: "It was scientifically proven that sufficient sleep improves mental performance." },
    patterns: [
      { ar: "ثَبَتَ (أَمرٌ)", en: "(something) was proven / confirmed" },
      { ar: "ثَبَتَ أَنَّ ...", en: "it was proven that ..." },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 5 — 25 verbs (prep-heavy + weak)
  // ═══════════════════════════════════════════════

  "طلع": {
    level_1: { ar: "طَلَعَتِ الشَّمسُ.", en: "The sun rose." },
    level_2: { ar: "طَلَعَ الرَّجُلُ إِلى السَّطحِ.", en: "The man went up to the roof." },
    level_3: { ar: "طَلَعَت نَتائِجُ الدِّراسَةِ مُخالِفَةً لِلتَّوَقُّعاتِ.", en: "The study results came out contrary to expectations." },
    patterns: [
      { ar: "طَلَعَ (شَيءٌ)", en: "rose / came out (something)" },
      { ar: "طَلَعَ إِلى (مَكان)", en: "went up to (a place)" },
      { ar: "طَلَعَ عَلى (شَيء)", en: "saw / discovered (something)" },
    ],
    mistakes: [],
  },

  "حفل": {
    level_1: { ar: "حَفَلَ المَكانُ بِالنّاسِ.", en: "The place was filled with people." },
    level_2: { ar: "حَفَلَ الكِتابُ بِالمَعلوماتِ المُفيدَةِ.", en: "The book was full of useful information." },
    level_3: { ar: "حَفَلَ تاريخُ المِنطَقَةِ بِالأَحداثِ الَّتي شَكَّلَت هُوِيَّتَها الثَّقافِيَّةَ.", en: "The region's history was full of events that shaped its cultural identity." },
    patterns: [
      { ar: "حَفَلَ بِ (شَيء)", en: "was filled with / abounded in (something)" },
    ],
    mistakes: [],
  },

  "بذل": {
    level_1: { ar: "بَذَلَ جُهدًا كَبيرًا.", en: "He made a great effort." },
    level_2: { ar: "بَذَلَ المُعَلِّمُ وَقتًا طَويلًا في تَحضيرِ الدُّروسِ.", en: "The teacher spent a long time preparing the lessons." },
    level_3: { ar: "بَذَلَتِ المُنَظَّمَةُ جُهودًا حَثيثَةً لِإيصالِ المُساعَداتِ إِلى المُتَضَرِّرينَ.", en: "The organization made vigorous efforts to deliver aid to those affected." },
    patterns: [
      { ar: "بَذَلَ (جُهدًا / مالًا)", en: "exerted / spent (effort / money)" },
    ],
    mistakes: [],
  },

  "ضمن": {
    level_1: { ar: "ضَمِنَ حَقَّهُ.", en: "He guaranteed his right." },
    level_2: { ar: "ضَمِنَ العَقدُ حُقوقَ الطَّرَفَينِ.", en: "The contract guaranteed the rights of both parties." },
    level_3: { ar: "ضَمِنَ الدُّستورُ الجَديدُ حُرِّيَّةَ التَّعبيرِ وَاستِقلالَ القَضاءِ.", en: "The new constitution guaranteed freedom of expression and judicial independence." },
    patterns: [
      { ar: "ضَمِنَ (شَيئًا)", en: "guaranteed (something)" },
      { ar: "ضَمِنَ (شَخصًا)", en: "vouched for (someone)" },
    ],
    mistakes: [],
  },

  "برز": {
    level_1: { ar: "بَرَزَ في المُسابَقَةِ.", en: "He stood out in the competition." },
    level_2: { ar: "بَرَزَ دَورُ المَرأَةِ في المُجتَمَعِ.", en: "The role of women emerged in society." },
    level_3: { ar: "بَرَزَتِ الحاجَةُ إِلى إِصلاحِ المَنظومَةِ التَّعليمِيَّةِ بَعدَ نَتائِجِ التَّقييمِ.", en: "The need to reform the educational system emerged after the evaluation results." },
    patterns: [
      { ar: "بَرَزَ (شَيءٌ / شَخصٌ)", en: "emerged / stood out (something / someone)" },
      { ar: "بَرَزَ في (مَجال)", en: "excelled in (a field)" },
    ],
    mistakes: [],
  },

  "بسط": {
    level_1: { ar: "بَسَطَ يَدَهُ.", en: "He extended his hand." },
    level_2: { ar: "بَسَطَ المُعَلِّمُ الفِكرَةَ لِلطُّلّابِ.", en: "The teacher simplified the idea for the students." },
    level_3: { ar: "بَسَطَتِ الدَّولَةُ سَيطَرَتَها عَلى المَناطِقِ الحُدودِيَّةِ.", en: "The state extended its control over the border areas." },
    patterns: [
      { ar: "بَسَطَ (شَيئًا)", en: "spread / extended / simplified (something)" },
      { ar: "بَسَطَ سَيطَرَتَهُ عَلى ...", en: "extended his control over ..." },
    ],
    mistakes: [],
  },

  "حلم": {
    level_1: { ar: "حَلَمَ بِالنَّجاحِ.", en: "He dreamed of success." },
    level_2: { ar: "حَلَمَتِ الطِّفلَةُ بِأَن تُصبِحَ طَبيبَةً.", en: "The girl dreamed of becoming a doctor." },
    level_3: { ar: "حَلَمَ جيلٌ كامِلٌ بِتَحقيقِ العَدالَةِ الاجتِماعِيَّةِ.", en: "An entire generation dreamed of achieving social justice." },
    patterns: [
      { ar: "حَلَمَ بِ (شَيء)", en: "dreamed of (something)" },
      { ar: "حَلَمَ أَن ...", en: "dreamed that / of ..." },
    ],
    mistakes: [
      { wrong_ar: "حَلَمَ عَنِ النَّجاحِ", right_ar: "حَلَمَ بِالنَّجاحِ", note_en: "حَلَمَ takes بِ not عَن." },
    ],
  },

  "أمر": {
    level_1: { ar: "أَمَرَهُ بِالجُلوسِ.", en: "He ordered him to sit." },
    level_2: { ar: "أَمَرَ القائِدُ الجُنودَ بِالتَّقَدُّمِ.", en: "The commander ordered the soldiers to advance." },
    level_3: { ar: "أَمَرَتِ المَحكَمَةُ بِإِعادَةِ التَّحقيقِ في القَضِيَّةِ.", en: "The court ordered the reinvestigation of the case." },
    patterns: [
      { ar: "أَمَرَ (شَخصًا) بِ (شَيء)", en: "ordered (someone) to (do something)" },
      { ar: "أَمَرَ بِ (فِعل)", en: "ordered / commanded (an action)" },
    ],
    mistakes: [
      { wrong_ar: "أَمَرَهُ أَن يَجلِسَ", right_ar: "أَمَرَهُ بِالجُلوسِ / أَمَرَهُ أَن يَجلِسَ", note_en: "Both بِ + masdar and أَن + verb are correct." },
    ],
  },

  "لمس": {
    level_1: { ar: "لَمَسَ الحائِطَ.", en: "He touched the wall." },
    level_2: { ar: "لَمَسَ الطَّبيبُ جَبينَ المَريضِ.", en: "The doctor touched the patient's forehead." },
    level_3: { ar: "لَمَسَ المُراقِبونَ تَحَسُّنًا مَلحوظًا في أَداءِ القِطاعِ الصِّحِّيِّ.", en: "Observers noticed a marked improvement in the performance of the health sector." },
    patterns: [
      { ar: "لَمَسَ (شَيئًا)", en: "touched / felt (something)" },
      { ar: "لَمَسَ (تَحَسُّنًا / فَرقًا)", en: "noticed / perceived (improvement / difference)" },
    ],
    mistakes: [],
  },

  "لحظ": {
    level_1: { ar: "لَحَظَ التَّغييرَ.", en: "He noticed the change." },
    level_2: { ar: "لَحَظَتِ الأُمُّ أَنَّ طِفلَها حَزينٌ.", en: "The mother noticed that her child was sad." },
    level_3: { ar: "لَحَظَ الباحِثونَ ارتِفاعًا في مُعَدَّلاتِ الهِجرَةِ الدّاخِلِيَّةِ.", en: "Researchers noticed an increase in internal migration rates." },
    patterns: [
      { ar: "لَحَظَ (شَيئًا)", en: "noticed (something)" },
      { ar: "لَحَظَ أَنَّ ...", en: "noticed that ..." },
    ],
    mistakes: [],
  },

  "رفض": {
    level_1: { ar: "رَفَضَ العَرضَ.", en: "He refused the offer." },
    level_2: { ar: "رَفَضَ المُوَظَّفُ نَقلَهُ إِلى فَرعٍ آخَرَ.", en: "The employee refused his transfer to another branch." },
    level_3: { ar: "رَفَضَتِ المُعارَضَةُ المَشروعَ بِحُجَّةِ أَنَّهُ لا يَخدِمُ المَصلَحَةَ العامَّةَ.", en: "The opposition rejected the bill on the grounds that it does not serve the public interest." },
    patterns: [
      { ar: "رَفَضَ (شَيئًا)", en: "refused / rejected (something)" },
      { ar: "رَفَضَ أَن يَفعَلَ ...", en: "refused to do ..." },
    ],
    mistakes: [],
  },

  "سكب": {
    level_1: { ar: "سَكَبَ الماءَ.", en: "He poured the water." },
    level_2: { ar: "سَكَبَتِ البِنتُ العَصيرَ في الكوبِ.", en: "The girl poured the juice into the cup." },
    level_3: { ar: "سَكَبَ المُتَحَدِّثُ مَشاعِرَهُ في خِطابٍ مُؤَثِّرٍ.", en: "The speaker poured his feelings into a moving speech." },
    patterns: [
      { ar: "سَكَبَ (سائِلًا) في (وِعاء)", en: "poured (liquid) into (container)" },
    ],
    mistakes: [],
  },

  "رسب": {
    level_1: { ar: "رَسَبَ في الامتِحانِ.", en: "He failed the exam." },
    level_2: { ar: "رَسَبَ عَشرَةُ طُلّابٍ في مادَّةِ الرِّياضِيّاتِ.", en: "Ten students failed in mathematics." },
    level_3: { ar: "رَسَبَتِ المُحاوَلاتُ الأُولى لِإِصلاحِ النِّظامِ لِغِيابِ الإِرادَةِ السِّياسِيَّةِ.", en: "The initial attempts to reform the system failed due to a lack of political will." },
    patterns: [
      { ar: "رَسَبَ في (امتِحان)", en: "failed (an exam)" },
    ],
    mistakes: [],
  },

  "نسب": {
    level_1: { ar: "نَسَبَ القَولَ إِلَيهِ.", en: "He attributed the saying to him." },
    level_2: { ar: "نَسَبَ الباحِثُ الاكتِشافَ إِلى العالِمِ العَرَبِيِّ.", en: "The researcher attributed the discovery to the Arab scientist." },
    level_3: { ar: "نَسَبَتِ الصُّحُفُ التَّصريحاتِ إِلى مَصادِرَ مَسؤولَةٍ لَم تُفصِح عَن هُوِيَّتِها.", en: "Newspapers attributed the statements to responsible sources that did not reveal their identity." },
    patterns: [
      { ar: "نَسَبَ (شَيئًا) إِلى (شَخص / مَصدَر)", en: "attributed (something) to (someone / source)" },
    ],
    mistakes: [],
  },

  "غرق": {
    level_1: { ar: "غَرِقَ في الماءِ.", en: "He drowned in the water." },
    level_2: { ar: "غَرِقَتِ السَّفينَةُ قُربَ الشّاطِئِ.", en: "The ship sank near the shore." },
    level_3: { ar: "غَرِقَتِ المَدينَةُ في الفَيَضاناتِ بَعدَ أَمطارٍ غَيرِ مَسبوقَةٍ.", en: "The city was submerged in floods after unprecedented rains." },
    patterns: [
      { ar: "غَرِقَ في (مَكان / شَيء)", en: "drowned / sank in (a place / thing)" },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 6 — 25 verbs (media, doubled, hamzated)
  // ═══════════════════════════════════════════════

  "صرف": {
    level_1: { ar: "صَرَفَ المالَ.", en: "He spent the money." },
    level_2: { ar: "صَرَفَ المُوَظَّفُ راتِبَهُ في أَوَّلِ الشَّهرِ.", en: "The employee received his salary at the beginning of the month." },
    level_3: { ar: "صَرَفَتِ الوِزارَةُ مَبالِغَ كَبيرَةً عَلى تَحديثِ البُنيَةِ التَّحتِيَّةِ.", en: "The ministry spent large amounts on modernizing the infrastructure." },
    patterns: [
      { ar: "صَرَفَ (مالًا) عَلى / في (شَيء)", en: "spent (money) on (something)" },
      { ar: "صَرَفَ النَّظَرَ عَن (شَيء)", en: "disregarded / dismissed (something)" },
    ],
    mistakes: [],
  },

  "حرص": {
    level_1: { ar: "حَرَصَ عَلى النَّظافَةِ.", en: "He was keen on cleanliness." },
    level_2: { ar: "حَرَصَتِ المُعَلِّمَةُ عَلى شَرحِ كُلِّ نُقطَةٍ.", en: "The teacher (f.) was keen on explaining every point." },
    level_3: { ar: "حَرَصَتِ القِيادَةُ عَلى تَحقيقِ التَّوازُنِ بَينَ التَّنمِيَةِ وَحِمايَةِ البيئَةِ.", en: "The leadership was keen on achieving a balance between development and environmental protection." },
    patterns: [
      { ar: "حَرَصَ عَلى (شَيء)", en: "was keen on / careful about (something)" },
    ],
    mistakes: [
      { wrong_ar: "حَرَصَ بِالنَّظافَةِ", right_ar: "حَرَصَ عَلى النَّظافَةِ", note_en: "حَرَصَ requires عَلى, not بِ." },
    ],
  },

  "عزم": {
    level_1: { ar: "عَزَمَ عَلى السَّفَرِ.", en: "He decided to travel." },
    level_2: { ar: "عَزَمَ الطَّالِبُ عَلى إِتمامِ دِراسَتِهِ.", en: "The student resolved to complete his studies." },
    level_3: { ar: "عَزَمَتِ الحُكومَةُ عَلى مُكافَحَةِ الفَسادِ بِإِجراءاتٍ صارِمَةٍ.", en: "The government resolved to fight corruption with strict measures." },
    patterns: [
      { ar: "عَزَمَ عَلى (فِعل / أَمر)", en: "resolved / determined to (do something)" },
    ],
    mistakes: [],
  },

  "ملأ": {
    level_1: { ar: "مَلَأَ الكوبَ.", en: "He filled the cup." },
    level_2: { ar: "مَلَأَتِ الأُمُّ الحَقيبَةَ بِالمَلابِسِ.", en: "The mother filled the bag with clothes." },
    level_3: { ar: "مَلَأَ الخَبَرُ وَسائِلَ الإِعلامِ وَأَثارَ جَدَلًا واسِعًا.", en: "The news filled the media and sparked widespread debate." },
    patterns: [
      { ar: "مَلَأَ (شَيئًا) بِ (مادَّة)", en: "filled (something) with (material)" },
    ],
    mistakes: [],
  },

  "نشأ": {
    level_1: { ar: "نَشَأَ في القَريَةِ.", en: "He grew up in the village." },
    level_2: { ar: "نَشَأَت صَداقَةٌ بَينَ الطّالِبَينِ.", en: "A friendship developed between the two students." },
    level_3: { ar: "نَشَأَتِ الأَزمَةُ نَتيجَةَ تَراكُمِ مُشكِلاتٍ هَيكَلِيَّةٍ عَلى مَدى عُقودٍ.", en: "The crisis arose as a result of the accumulation of structural problems over decades." },
    patterns: [
      { ar: "نَشَأَ في (مَكان)", en: "grew up in (a place)" },
      { ar: "نَشَأَ (شَيءٌ) عَن / مِن (سَبَب)", en: "(something) arose from (a cause)" },
    ],
    mistakes: [],
  },

  "مدح": {
    level_1: { ar: "مَدَحَ صَديقَهُ.", en: "He praised his friend." },
    level_2: { ar: "مَدَحَ المُديرُ أَداءَ الفَريقِ.", en: "The manager praised the team's performance." },
    level_3: { ar: "مَدَحَ النُّقّادُ الرِّوايَةَ الجَديدَةَ وَوَصَفوها بِالعَمَلِ المُتَمَيِّزِ.", en: "Critics praised the new novel and described it as an outstanding work." },
    patterns: [
      { ar: "مَدَحَ (شَخصًا / شَيئًا)", en: "praised / commended (someone / something)" },
    ],
    mistakes: [],
  },

  "سحر": {
    level_1: { ar: "سَحَرَهُ الجَمالُ.", en: "The beauty enchanted him." },
    level_2: { ar: "سَحَرَتِ المَدينَةُ الزُّوّارَ بِجَمالِها.", en: "The city enchanted the visitors with its beauty." },
    level_3: { ar: "سَحَرَ الخَطيبُ الجُمهورَ بِأُسلوبِهِ البَليغِ وَثِقَتِهِ بِنَفسِهِ.", en: "The speaker captivated the audience with his eloquent style and self-confidence." },
    patterns: [
      { ar: "سَحَرَ (شَخصًا)", en: "enchanted / captivated (someone)" },
    ],
    mistakes: [],
  },

  "طعن": {
    level_1: { ar: "طَعَنَ بِالسِّكّينِ.", en: "He stabbed with the knife." },
    level_2: { ar: "طَعَنَ المُحامي في الحُكمِ.", en: "The lawyer contested the verdict." },
    level_3: { ar: "طَعَنَتِ المُعارَضَةُ في شَرعِيَّةِ الانتِخاباتِ أَمامَ المَحكَمَةِ الدُّستورِيَّةِ.", en: "The opposition contested the legitimacy of the elections before the constitutional court." },
    patterns: [
      { ar: "طَعَنَ (شَخصًا) بِ (سِلاح)", en: "stabbed (someone) with (weapon)" },
      { ar: "طَعَنَ في (حُكم / قَرار)", en: "contested / challenged (a verdict / decision)" },
    ],
    mistakes: [],
  },

  "بهر": {
    level_1: { ar: "بَهَرَهُ المَنظَرُ.", en: "The view dazzled him." },
    level_2: { ar: "بَهَرَتِ الحَفلَةُ الحُضورَ بِتَنظيمِها الرّائِعِ.", en: "The ceremony dazzled the attendees with its wonderful organization." },
    level_3: { ar: "بَهَرَتِ التَّجرِبَةُ العِلمِيَّةُ المُجتَمَعَ الأَكاديمِيَّ بِنَتائِجِها غَيرِ المُتَوَقَّعَةِ.", en: "The scientific experiment impressed the academic community with its unexpected results." },
    patterns: [
      { ar: "بَهَرَ (شَخصًا)", en: "dazzled / impressed (someone)" },
    ],
    mistakes: [],
  },

  "خطف": {
    level_1: { ar: "خَطَفَ الحَقيبَةَ.", en: "He snatched the bag." },
    level_2: { ar: "خَطَفَ اللِّصُّ الهاتِفَ مِن يَدِها.", en: "The thief snatched the phone from her hand." },
    level_3: { ar: "خَطَفَ الفَريقُ الفَوزَ في الدَّقائِقِ الأَخيرَةِ مِنَ المُباراةِ.", en: "The team snatched victory in the last minutes of the match." },
    patterns: [
      { ar: "خَطَفَ (شَيئًا) مِن (شَخص / مَكان)", en: "snatched (something) from (someone / place)" },
    ],
    mistakes: [],
  },

  "صفح": {
    level_1: { ar: "صَفَحَ عَنهُ.", en: "He forgave him." },
    level_2: { ar: "صَفَحَ الرَّجُلُ عَمَّن أَساءَ إِلَيهِ.", en: "The man forgave those who wronged him." },
    level_3: { ar: "صَفَحَتِ القَبيلَةُ عَنِ الجاني تَحقيقًا لِلمُصالَحَةِ.", en: "The tribe pardoned the offender to achieve reconciliation." },
    patterns: [
      { ar: "صَفَحَ عَن (شَخص)", en: "forgave / pardoned (someone)" },
    ],
    mistakes: [],
  },

  "مزح": {
    level_1: { ar: "مَزَحَ مَعَ صَديقِهِ.", en: "He joked with his friend." },
    level_2: { ar: "مَزَحَ المُعَلِّمُ مَعَ الطُّلّابِ لِيُخَفِّفَ التَّوَتُّرَ.", en: "The teacher joked with the students to ease the tension." },
    level_3: { ar: "مَزَحَ الرَّئيسُ خِلالَ المُؤتَمَرِ مِمّا أَثارَ ضَحِكَ الحُضورِ.", en: "The president joked during the conference, which drew laughter from the audience." },
    patterns: [
      { ar: "مَزَحَ مَعَ (شَخص)", en: "joked with (someone)" },
    ],
    mistakes: [],
  },

  "نبع": {
    level_1: { ar: "نَبَعَ الماءُ.", en: "Water sprang forth." },
    level_2: { ar: "نَبَعَتِ الفِكرَةُ مِن تَجرِبَتِهِ الشَّخصِيَّةِ.", en: "The idea sprang from his personal experience." },
    level_3: { ar: "نَبَعَ القَرارُ مِن رُؤيَةٍ استِراتيجِيَّةٍ طَويلَةِ الأَمَدِ.", en: "The decision stemmed from a long-term strategic vision." },
    patterns: [
      { ar: "نَبَعَ (شَيءٌ) مِن (مَصدَر)", en: "sprang / stemmed from (a source)" },
    ],
    mistakes: [],
  },

  "طمح": {
    level_1: { ar: "طَمَحَ إِلى النَّجاحِ.", en: "He aspired to success." },
    level_2: { ar: "طَمَحَ الشّابُّ إِلى وَظيفَةٍ مَرموقَةٍ.", en: "The young man aspired to a prestigious job." },
    level_3: { ar: "طَمَحَتِ الشَّرِكَةُ إِلى التَّوَسُّعِ في الأَسواقِ الآسيوِيَّةِ.", en: "The company aspired to expand into Asian markets." },
    patterns: [
      { ar: "طَمَحَ إِلى (شَيء)", en: "aspired to (something)" },
    ],
    mistakes: [
      { wrong_ar: "طَمَحَ بِالنَّجاحِ", right_ar: "طَمَحَ إِلى النَّجاحِ", note_en: "طَمَحَ takes إِلى, not بِ." },
    ],
  },

  "درج": {
    level_1: { ar: "دَرَجَ عَلى العادَةِ.", en: "He was accustomed to the habit." },
    level_2: { ar: "دَرَجَ النّاسُ عَلى الاحتِفالِ بِهَذا اليَومِ.", en: "People were accustomed to celebrating this day." },
    level_3: { ar: "دَرَجَتِ المُؤَسَّساتُ عَلى اتِّباعِ مَنهَجِيَّةٍ تَقليدِيَّةٍ في التَّخطيطِ.", en: "Institutions were accustomed to following a traditional methodology in planning." },
    patterns: [
      { ar: "دَرَجَ عَلى (عادَة / فِعل)", en: "was accustomed to (a habit / doing something)" },
    ],
    mistakes: [],
  },

  "شمل": {
    level_1: { ar: "شَمَلَ الجَميعَ.", en: "It included everyone." },
    level_2: { ar: "شَمَلَ البَرنامَجُ عِدَّةَ أَنشِطَةٍ.", en: "The program included several activities." },
    level_3: { ar: "شَمَلَتِ الإِصلاحاتُ القِطاعاتِ الاقتِصادِيَّةَ وَالتَّعليمِيَّةَ وَالصِّحِّيَّةَ.", en: "The reforms encompassed the economic, educational, and health sectors." },
    patterns: [
      { ar: "شَمَلَ (شَيئًا / مَجموعَة)", en: "included / encompassed (something / a group)" },
    ],
    mistakes: [],
  },

  "فرغ": {
    level_1: { ar: "فَرَغَ مِنَ العَمَلِ.", en: "He finished the work." },
    level_2: { ar: "فَرَغَ الطَّالِبُ مِن كِتابَةِ البَحثِ.", en: "The student finished writing the research." },
    level_3: { ar: "فَرَغَتِ اللَّجنَةُ مِن إِعدادِ التَّقريرِ النِّهائِيِّ وَرَفَعَتهُ إِلى الإِدارَةِ.", en: "The committee finished preparing the final report and submitted it to management." },
    patterns: [
      { ar: "فَرَغَ مِن (عَمَل)", en: "finished / was done with (work)" },
      { ar: "فَرَغَ لِ (شَيء)", en: "freed oneself for (something)" },
    ],
    mistakes: [],
  },

  "صرخ": {
    level_1: { ar: "صَرَخَ بِصَوتٍ عالٍ.", en: "He shouted loudly." },
    level_2: { ar: "صَرَخَتِ الأُمُّ حينَ رَأَت ابنَها في خَطَرٍ.", en: "The mother screamed when she saw her son in danger." },
    level_3: { ar: "صَرَخَ المُحتَجّونَ مُطالِبينَ بِتَحسينِ ظُروفِ العَمَلِ.", en: "The protesters shouted demanding an improvement in working conditions." },
    patterns: [
      { ar: "صَرَخَ (بِدونِ مَفعول)", en: "shouted / screamed (intransitive)" },
      { ar: "صَرَخَ في وَجهِ (شَخص)", en: "yelled at (someone)" },
    ],
    mistakes: [],
  },

  "طرد": {
    level_1: { ar: "طَرَدَهُ مِنَ البَيتِ.", en: "He expelled him from the house." },
    level_2: { ar: "طَرَدَتِ الشَّرِكَةُ المُوَظَّفَ بِسَبَبِ سوءِ سُلوكِهِ.", en: "The company fired the employee for his bad behavior." },
    level_3: { ar: "طَرَدَتِ الحُكومَةُ السَّفيرَ رَدًّا عَلى التَّصريحاتِ المُسيئَةِ.", en: "The government expelled the ambassador in response to the offensive statements." },
    patterns: [
      { ar: "طَرَدَ (شَخصًا) مِن (مَكان)", en: "expelled / fired (someone) from (a place)" },
    ],
    mistakes: [],
  },

  "خجل": {
    level_1: { ar: "خَجِلَ مِن خَطَئِهِ.", en: "He was embarrassed by his mistake." },
    level_2: { ar: "خَجِلَتِ البِنتُ مِنَ الكَلامِ أَمامَ الجُمهورِ.", en: "The girl was shy about speaking in front of the audience." },
    level_3: { ar: "خَجِلَ المَسؤولُ مِن نَتائِجِ تَقريرِ الأَداءِ وَوَعَدَ بِالتَّحسينِ.", en: "The official was embarrassed by the performance report results and promised improvement." },
    patterns: [
      { ar: "خَجِلَ مِن (شَيء / شَخص)", en: "was embarrassed by / ashamed of (something / someone)" },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 7 — 26 verbs (to reach 200 total)
  // ═══════════════════════════════════════════════

  "سخر": {
    level_1: { ar: "سَخِرَ مِنهُ.", en: "He mocked him." },
    level_2: { ar: "سَخِرَ الأَولادُ مِن زَميلِهِم.", en: "The boys mocked their classmate." },
    level_3: { ar: "سَخِرَ بَعضُ النُّقّادِ مِنَ المَشروعِ قَبلَ أَن يُثبِتَ نَجاحَهُ.", en: "Some critics mocked the project before it proved its success." },
    patterns: [
      { ar: "سَخِرَ مِن (شَخص / شَيء)", en: "mocked / ridiculed (someone / something)" },
    ],
    mistakes: [
      { wrong_ar: "سَخِرَ عَلَيهِ", right_ar: "سَخِرَ مِنهُ", note_en: "سَخِرَ takes مِن, not عَلى." },
    ],
  },

  "نبذ": {
    level_1: { ar: "نَبَذَ العُنفَ.", en: "He rejected violence." },
    level_2: { ar: "نَبَذَ المُجتَمَعُ سُلوكَهُ.", en: "Society rejected his behavior." },
    level_3: { ar: "نَبَذَتِ الأُمَمُ المُتَّحِدَةُ كُلَّ أَشكالِ التَّمييزِ العُنصُرِيِّ.", en: "The United Nations rejected all forms of racial discrimination." },
    patterns: [
      { ar: "نَبَذَ (شَيئًا / شَخصًا)", en: "rejected / cast aside (something / someone)" },
    ],
    mistakes: [],
  },

  "مكث": {
    level_1: { ar: "مَكَثَ في البَيتِ.", en: "He stayed at home." },
    level_2: { ar: "مَكَثَ المُسافِرُ أُسبوعًا في الفُندُقِ.", en: "The traveler stayed a week at the hotel." },
    level_3: { ar: "مَكَثَ الفَريقُ الطِّبِّيُّ في المِنطَقَةِ المَنكوبَةِ ثَلاثَةَ أَشهُرٍ.", en: "The medical team stayed in the disaster-stricken area for three months." },
    patterns: [
      { ar: "مَكَثَ في (مَكان)", en: "stayed / remained in (a place)" },
    ],
    mistakes: [],
  },

  "نذر": {
    level_1: { ar: "نَذَرَ نَذرًا.", en: "He made a vow." },
    level_2: { ar: "نَذَرَ حَياتَهُ لِخِدمَةِ العِلمِ.", en: "He devoted his life to serving knowledge." },
    level_3: { ar: "نَذَرَتِ المُؤَسَّسَةُ مَواردَها لِدَعمِ الأَبحاثِ الطِّبِّيَّةِ المُتَقَدِّمَةِ.", en: "The institution devoted its resources to supporting advanced medical research." },
    patterns: [
      { ar: "نَذَرَ (شَيئًا) لِ (غَرَض)", en: "vowed / devoted (something) to (a purpose)" },
    ],
    mistakes: [],
  },

  "بشر": {
    level_1: { ar: "بَشَّرَهُ بِالنَّجاحِ.", en: "He gave him the good news of success." },
    level_2: { ar: "بَشَّرَ الطَّبيبُ الأُسرَةَ بِسَلامَةِ المَريضِ.", en: "The doctor gave the family the good news of the patient's safety." },
    level_3: { ar: "بَشَّرَتِ المُؤَشِّراتُ الاقتِصادِيَّةُ بِانتِعاشٍ تَدريجِيٍّ في القِطاعاتِ الإِنتاجِيَّةِ.", en: "Economic indicators heralded a gradual recovery in the productive sectors." },
    patterns: [
      { ar: "بَشَّرَ (شَخصًا) بِ (خَبَر)", en: "gave (someone) good news of (something)" },
    ],
    mistakes: [],
  },

  "خبر": {
    level_1: { ar: "خَبَرَ الأَمرَ.", en: "He experienced the matter." },
    level_2: { ar: "خَبَرَ الرَّجُلُ الحَياةَ وَتَعَلَّمَ مِنها.", en: "The man experienced life and learned from it." },
    level_3: { ar: "خَبَرَ المُفاوِضُ المَخضَرَمُ صُعوبَةَ الوُصولِ إِلى حُلولٍ وَسَطٍ.", en: "The veteran negotiator knew well the difficulty of reaching compromise solutions." },
    patterns: [
      { ar: "خَبَرَ (شَيئًا)", en: "experienced / knew well (something)" },
    ],
    mistakes: [],
  },

  "حسد": {
    level_1: { ar: "حَسَدَهُ عَلى نَجاحِهِ.", en: "He envied him for his success." },
    level_2: { ar: "حَسَدَ الجارُ جارَهُ عَلى بَيتِهِ الجَديدِ.", en: "The neighbor envied his neighbor for his new house." },
    level_3: { ar: "حَسَدَهُ زُمَلاؤُهُ عَلى تَرقِيَتِهِ السَّريعَةِ في العَمَلِ.", en: "His colleagues envied him for his rapid promotion at work." },
    patterns: [
      { ar: "حَسَدَ (شَخصًا) عَلى (شَيء)", en: "envied (someone) for (something)" },
    ],
    mistakes: [],
  },

  "سجد": {
    level_1: { ar: "سَجَدَ للهِ.", en: "He prostrated to God." },
    level_2: { ar: "سَجَدَ المُصَلّونَ شُكرًا للهِ.", en: "The worshippers prostrated in gratitude to God." },
    level_3: { ar: "سَجَدَ الجُمهورُ إِعجابًا بِالأَداءِ الفَنِّيِّ المُذهِلِ.", en: "The audience bowed in admiration of the stunning artistic performance." },
    patterns: [
      { ar: "سَجَدَ لِ (اللهِ)", en: "prostrated to (God)" },
    ],
    mistakes: [],
  },

  "عبد": {
    level_1: { ar: "عَبَدَ اللهَ.", en: "He worshipped God." },
    level_2: { ar: "عَبَدَ اللهَ بِإِخلاصٍ.", en: "He worshipped God sincerely." },
    level_3: { ar: "عَبَدَ المُؤمِنونَ رَبَّهُم فَأَثابَهُم خَيرًا.", en: "The believers worshipped their Lord and He rewarded them well." },
    patterns: [
      { ar: "عَبَدَ (اللهَ)", en: "worshipped (God)" },
    ],
    mistakes: [],
  },

  "نسخ": {
    level_1: { ar: "نَسَخَ الوَثيقَةَ.", en: "He copied the document." },
    level_2: { ar: "نَسَخَ الطَّالِبُ المُلاحَظاتِ مِنَ السَّبّورَةِ.", en: "The student copied the notes from the board." },
    level_3: { ar: "نَسَخَتِ الشَّرِكَةُ النِّظامَ القَديمَ وَاستَبدَلَتهُ بِمَنظومَةٍ رَقمِيَّةٍ حَديثَةٍ.", en: "The company superseded the old system and replaced it with a modern digital one." },
    patterns: [
      { ar: "نَسَخَ (شَيئًا)", en: "copied / superseded (something)" },
    ],
    mistakes: [],
  },

  "سكت": {
    level_1: { ar: "سَكَتَ عَنِ الكَلامِ.", en: "He fell silent." },
    level_2: { ar: "سَكَتَ الطِّفلُ بَعدَ أَن بَكى طَويلًا.", en: "The child fell silent after crying for a long time." },
    level_3: { ar: "سَكَتَ المَسؤولونَ عَنِ التَّعليقِ عَلى الأَحداثِ رَغمَ المَطالِبِ الشَّعبِيَّةِ.", en: "Officials refrained from commenting on the events despite popular demands." },
    patterns: [
      { ar: "سَكَتَ عَن (شَيء)", en: "was silent about / refrained from (something)" },
    ],
    mistakes: [],
  },

  "نصب": {
    level_1: { ar: "نَصَبَ الخَيمَةَ.", en: "He set up the tent." },
    level_2: { ar: "نَصَبَ العُمّالُ السَّقّالَةَ حَولَ المَبنى.", en: "The workers set up the scaffolding around the building." },
    level_3: { ar: "نَصَبَ المُحتالُ فَخًّا لِضَحاياهُ عَبرَ عُروضٍ وَهمِيَّةٍ عَلى الإِنتَرنِت.", en: "The fraudster set a trap for his victims through fake online offers." },
    patterns: [
      { ar: "نَصَبَ (شَيئًا)", en: "set up / erected (something)" },
      { ar: "نَصَبَ (فَخًّا / كَميلًا)", en: "set (a trap / ambush)" },
    ],
    mistakes: [],
  },

  "خزن": {
    level_1: { ar: "خَزَنَ الطَّعامَ.", en: "He stored the food." },
    level_2: { ar: "خَزَنَتِ الشَّرِكَةُ البَضائِعَ في المُستَودَعِ.", en: "The company stored the goods in the warehouse." },
    level_3: { ar: "خَزَنَتِ الدَّولَةُ احتِياطِيّاتٍ كَبيرَةً مِنَ القَمحِ تَحَسُّبًا لِأَيِّ أَزمَةٍ.", en: "The state stored large reserves of wheat in anticipation of any crisis." },
    patterns: [
      { ar: "خَزَنَ (شَيئًا) في (مَكان)", en: "stored (something) in (a place)" },
    ],
    mistakes: [],
  },

  "صلح": {
    level_1: { ar: "صَلَحَ الأَمرُ.", en: "The matter was fixed." },
    level_2: { ar: "صَلَحَتِ العَلاقَةُ بَينَهُما بَعدَ الحِوارِ.", en: "The relationship between them improved after the dialogue." },
    level_3: { ar: "صَلَحَتِ الأَوضاعُ الأَمنِيَّةُ تَدريجِيًّا بَعدَ تَدَخُّلِ قُوّاتِ حِفظِ السَّلامِ.", en: "The security situation improved gradually after the intervention of peacekeeping forces." },
    patterns: [
      { ar: "صَلَحَ (أَمرٌ / شَيءٌ)", en: "(something) was fixed / became right" },
      { ar: "صَلَحَ لِ (غَرَض)", en: "was suitable for (a purpose)" },
    ],
    mistakes: [],
  },

  "فسد": {
    level_1: { ar: "فَسَدَ الطَّعامُ.", en: "The food went bad." },
    level_2: { ar: "فَسَدَتِ العَلاقَةُ بَينَ الشَّريكَينِ.", en: "The relationship between the two partners went sour." },
    level_3: { ar: "فَسَدَتِ المُفاوَضاتُ بَعدَ رَفضِ أَحَدِ الأَطرافِ الشُّروطَ المُقتَرَحَةَ.", en: "The negotiations broke down after one of the parties rejected the proposed terms." },
    patterns: [
      { ar: "فَسَدَ (شَيءٌ)", en: "(something) went bad / became corrupt" },
    ],
    mistakes: [],
  },

  "عمر": {
    level_1: { ar: "عَمَرَ البَيتَ.", en: "He built the house." },
    level_2: { ar: "عَمَرَ الجَدُّ هَذِهِ الأَرضَ.", en: "The grandfather cultivated this land." },
    level_3: { ar: "عَمَرَتِ الحَضارَةُ الإِسلامِيَّةُ أَقاليمَ واسِعَةً مِنَ العالَمِ.", en: "Islamic civilization developed vast regions of the world." },
    patterns: [
      { ar: "عَمَرَ (مَكانًا / أَرضًا)", en: "built up / cultivated (a place / land)" },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 8 — 20 verbs (high-frequency daraba)
  // ═══════════════════════════════════════════════

  "غلب": {
    level_1: { ar: "غَلَبَ خَصمَهُ.", en: "He defeated his opponent." },
    level_2: { ar: "غَلَبَ الفَريقُ المُنافِسَ بِفارِقٍ كَبيرٍ.", en: "The team defeated the rival by a large margin." },
    level_3: { ar: "غَلَبَ النَّومُ المُسافِرينَ بَعدَ رِحلَةٍ طَويلَةٍ وَمُرهِقَةٍ.", en: "Sleep overcame the travelers after a long and exhausting journey." },
    patterns: [
      { ar: "غَلَبَ (شَخصًا / شَيئًا)", en: "defeated / overcame (someone / something)" },
      { ar: "غَلَبَ عَلى (شَيء)", en: "predominated over (something)" },
    ],
    mistakes: [],
  },

  "سبق": {
    level_1: { ar: "سَبَقَ زَميلَهُ.", en: "He outran his classmate." },
    level_2: { ar: "سَبَقَ الطَّالِبُ أَقرانَهُ في المُسابَقَةِ.", en: "The student surpassed his peers in the competition." },
    level_3: { ar: "سَبَقَت هَذِهِ الدَّولَةُ جيرانَها في تَبَنّي سِياساتِ الطّاقَةِ النَّظيفَةِ.", en: "This country preceded its neighbors in adopting clean energy policies." },
    patterns: [
      { ar: "سَبَقَ (شَخصًا)", en: "preceded / outran (someone)" },
      { ar: "سَبَقَ أَن ...", en: "it previously happened that ..." },
      { ar: "سَبَقَ لَهُ أَن ...", en: "he had previously ..." },
    ],
    mistakes: [],
  },

  "نطق": {
    level_1: { ar: "نَطَقَ بِالكَلِمَةِ.", en: "He pronounced the word." },
    level_2: { ar: "نَطَقَ الطِّفلُ كَلِمَتَهُ الأُولى.", en: "The child spoke his first word." },
    level_3: { ar: "نَطَقَتِ المَحكَمَةُ بِالحُكمِ بَعدَ مُداوَلاتٍ استَمَرَّت ساعاتٍ.", en: "The court pronounced the verdict after deliberations that lasted hours." },
    patterns: [
      { ar: "نَطَقَ بِ (كَلِمَة / حُكم)", en: "uttered / pronounced (a word / verdict)" },
    ],
    mistakes: [
      { wrong_ar: "نَطَقَ الكَلِمَةَ", right_ar: "نَطَقَ بِالكَلِمَةِ", note_en: "نَطَقَ requires بِ for the thing uttered." },
    ],
  },

  "حبس": {
    level_1: { ar: "حَبَسَ أَنفاسَهُ.", en: "He held his breath." },
    level_2: { ar: "حَبَسَتِ الشُّرطَةُ المُتَّهَمَ.", en: "The police detained the suspect." },
    level_3: { ar: "حَبَسَ المُشاهِدونَ أَنفاسَهُم أَثناءَ العَرضِ المُثيرِ.", en: "The spectators held their breath during the thrilling show." },
    patterns: [
      { ar: "حَبَسَ (شَخصًا)", en: "imprisoned / detained (someone)" },
      { ar: "حَبَسَ أَنفاسَهُ / دُموعَهُ", en: "held his breath / held back his tears" },
    ],
    mistakes: [],
  },

  "سرق": {
    level_1: { ar: "سَرَقَ المالَ.", en: "He stole the money." },
    level_2: { ar: "سَرَقَ اللِّصُّ المَحَلَّ لَيلًا.", en: "The thief robbed the shop at night." },
    level_3: { ar: "سَرَقَتِ التِّكنولوجيا اهتِمامَ الأَطفالِ وَأَبعَدَتهُم عَنِ الأَنشِطَةِ البَدَنِيَّةِ.", en: "Technology stole children's attention and kept them from physical activities." },
    patterns: [
      { ar: "سَرَقَ (شَيئًا) مِن (شَخص / مَكان)", en: "stole (something) from (someone / place)" },
    ],
    mistakes: [],
  },

  "ملك": {
    level_1: { ar: "مَلَكَ بَيتًا.", en: "He owned a house." },
    level_2: { ar: "مَلَكَ الرَّجُلُ شَرِكَةً صَغيرَةً.", en: "The man owned a small company." },
    level_3: { ar: "مَلَكَ القائِدُ القُدرَةَ عَلى إِقناعِ الجُمهورِ بِرُؤيَتِهِ.", en: "The leader possessed the ability to convince the public of his vision." },
    patterns: [
      { ar: "مَلَكَ (شَيئًا)", en: "owned / possessed (something)" },
    ],
    mistakes: [],
  },

  "كسر": {
    level_1: { ar: "كَسَرَ الكوبَ.", en: "He broke the cup." },
    level_2: { ar: "كَسَرَ اللّاعِبُ الرَّقمَ القِياسِيَّ.", en: "The player broke the record." },
    level_3: { ar: "كَسَرَتِ النَّتائِجُ حاجِزَ التَّوَقُّعاتِ وَأَذهَلَتِ المُراقِبينَ.", en: "The results broke the barrier of expectations and astounded observers." },
    patterns: [
      { ar: "كَسَرَ (شَيئًا)", en: "broke (something)" },
    ],
    mistakes: [],
  },

  "عرض": {
    level_1: { ar: "عَرَضَ الفِكرَةَ.", en: "He presented the idea." },
    level_2: { ar: "عَرَضَ التّاجِرُ بَضاعَتَهُ في السّوقِ.", en: "The merchant displayed his goods in the market." },
    level_3: { ar: "عَرَضَتِ الوِزارَةُ خُطَّتَها الإِصلاحِيَّةَ عَلى البَرلَمانِ لِلمُناقَشَةِ.", en: "The ministry presented its reform plan to parliament for discussion." },
    patterns: [
      { ar: "عَرَضَ (شَيئًا) عَلى (شَخص / جِهَة)", en: "presented (something) to (someone / body)" },
      { ar: "عَرَضَ (شَيئًا) لِلبَيعِ", en: "offered (something) for sale" },
    ],
    mistakes: [],
  },

  "فرض": {
    level_1: { ar: "فَرَضَ قانونًا جَديدًا.", en: "He imposed a new law." },
    level_2: { ar: "فَرَضَتِ الحُكومَةُ ضَرائِبَ إِضافِيَّةً.", en: "The government imposed additional taxes." },
    level_3: { ar: "فَرَضَتِ الظُّروفُ الاقتِصادِيَّةُ تَحَوُّلاتٍ جَذرِيَّةً في سِياسَةِ الدَّعمِ.", en: "The economic conditions necessitated radical changes in the subsidy policy." },
    patterns: [
      { ar: "فَرَضَ (شَيئًا) عَلى (شَخص / جِهَة)", en: "imposed (something) on (someone / body)" },
      { ar: "فَرَضَ نَفسَهُ", en: "imposed itself / proved unavoidable" },
    ],
    mistakes: [],
  },

  "صنع": {
    level_1: { ar: "صَنَعَ كُرسِيًّا.", en: "He made a chair." },
    level_2: { ar: "صَنَعَ الحَدّادُ سَيفًا مَتينًا.", en: "The blacksmith made a sturdy sword." },
    level_3: { ar: "صَنَعَتِ الشَّرِكَةُ أَجهِزَةً إِلِكترونِيَّةً تُنافِسُ المُنتَجاتِ العالَمِيَّةَ.", en: "The company manufactured electronic devices that compete with global products." },
    patterns: [
      { ar: "صَنَعَ (شَيئًا)", en: "made / manufactured (something)" },
      { ar: "صَنَعَ (شَيئًا) مِن (مادَّة)", en: "made (something) from (material)" },
    ],
    mistakes: [],
  },

  "جمع": {
    level_1: { ar: "جَمَعَ الكُتُبَ.", en: "He gathered the books." },
    level_2: { ar: "جَمَعَ المُتَطَوِّعونَ تَبَرُّعاتٍ لِلمُحتاجينَ.", en: "Volunteers collected donations for those in need." },
    level_3: { ar: "جَمَعَتِ المُبادَرَةُ بَينَ خُبَراءَ مِن مُختَلَفِ القِطاعاتِ لِوَضعِ استِراتيجِيَّةٍ شامِلَةٍ.", en: "The initiative brought together experts from various sectors to develop a comprehensive strategy." },
    patterns: [
      { ar: "جَمَعَ (أَشياء)", en: "gathered / collected (things)" },
      { ar: "جَمَعَ بَينَ (شَيئَين)", en: "combined / brought together (two things)" },
    ],
    mistakes: [],
  },

  "قطع": {
    level_1: { ar: "قَطَعَ الحَبلَ.", en: "He cut the rope." },
    level_2: { ar: "قَطَعَ السّائِقُ مَسافَةً طَويلَةً.", en: "The driver covered a long distance." },
    level_3: { ar: "قَطَعَتِ الحُكومَةُ العَلاقاتِ الدِّبلوماسِيَّةَ مَعَ الدَّولَةِ المُجاوِرَةِ.", en: "The government severed diplomatic relations with the neighboring country." },
    patterns: [
      { ar: "قَطَعَ (شَيئًا)", en: "cut / severed (something)" },
      { ar: "قَطَعَ (مَسافَة)", en: "covered / traversed (a distance)" },
      { ar: "قَطَعَ عَهدًا / وَعدًا", en: "made a pledge / promise" },
    ],
    mistakes: [],
  },

  "رفع": {
    level_1: { ar: "رَفَعَ يَدَهُ.", en: "He raised his hand." },
    level_2: { ar: "رَفَعَ العامِلُ الصُّندوقَ بِصُعوبَةٍ.", en: "The worker lifted the box with difficulty." },
    level_3: { ar: "رَفَعَ المُحامي دَعوى قَضائِيَّةً ضِدَّ الشَّرِكَةِ.", en: "The lawyer filed a lawsuit against the company." },
    patterns: [
      { ar: "رَفَعَ (شَيئًا)", en: "raised / lifted (something)" },
      { ar: "رَفَعَ دَعوى", en: "filed a lawsuit" },
      { ar: "رَفَعَ صَوتَهُ", en: "raised his voice" },
    ],
    mistakes: [],
  },

  "منع": {
    level_1: { ar: "مَنَعَهُ مِنَ الخُروجِ.", en: "He prevented him from going out." },
    level_2: { ar: "مَنَعَتِ الشُّرطَةُ السَّيّاراتِ مِنَ الدُّخولِ.", en: "The police prevented cars from entering." },
    level_3: { ar: "مَنَعَتِ اللَّوائِحُ الجَديدَةُ الشَّرِكاتِ مِن تَوظيفِ الأَطفالِ.", en: "The new regulations prohibited companies from employing children." },
    patterns: [
      { ar: "مَنَعَ (شَخصًا) مِن (فِعل)", en: "prevented (someone) from (doing something)" },
    ],
    mistakes: [
      { wrong_ar: "مَنَعَهُ عَنِ الخُروجِ", right_ar: "مَنَعَهُ مِنَ الخُروجِ", note_en: "مَنَعَ takes مِن not عَن for the prevented action." },
    ],
  },

  "بعث": {
    level_1: { ar: "بَعَثَ رِسالَةً.", en: "He sent a letter." },
    level_2: { ar: "بَعَثَتِ الجامِعَةُ طُلّابًا في بَعثاتٍ دِراسِيَّةٍ.", en: "The university sent students on study missions." },
    level_3: { ar: "بَعَثَ الخَبَرُ الأَمَلَ في نُفوسِ السُّكّانِ المُتَضَرِّرينَ.", en: "The news inspired hope in the hearts of the affected residents." },
    patterns: [
      { ar: "بَعَثَ (شَيئًا / شَخصًا)", en: "sent (something / someone)" },
      { ar: "بَعَثَ (شُعورًا) في (شَخص)", en: "inspired / aroused (a feeling) in (someone)" },
    ],
    mistakes: [],
  },

  "حفر": {
    level_1: { ar: "حَفَرَ حُفرَةً.", en: "He dug a hole." },
    level_2: { ar: "حَفَرَ العُمّالُ الأَرضَ لِبِناءِ الأَساسِ.", en: "The workers dug the ground to build the foundation." },
    level_3: { ar: "حَفَرَ العُلَماءُ في أَعماقِ التّاريخِ لِكَشفِ حَقائِقَ جَديدَةٍ.", en: "Scholars dug into the depths of history to uncover new facts." },
    patterns: [
      { ar: "حَفَرَ (شَيئًا)", en: "dug (something)" },
      { ar: "حَفَرَ في (مَكان / مَوضوع)", en: "dug in (a place / topic)" },
    ],
    mistakes: [],
  },

  "طلق": {
    level_1: { ar: "طَلَقَ زَوجَتَهُ.", en: "He divorced his wife." },
    level_2: { ar: "طَلَقَ الصَّيّادُ النّارَ في الهَواءِ.", en: "The hunter fired a shot in the air." },
    level_3: { ar: "طَلَقَتِ السُّلُطاتُ سَراحَ المُعتَقَلينَ بَعدَ اتِّفاقِ المُصالَحَةِ.", en: "The authorities released the detainees after the reconciliation agreement." },
    patterns: [
      { ar: "طَلَقَ (زَوجَة)", en: "divorced (a wife)" },
      { ar: "طَلَقَ النّارَ", en: "fired / shot" },
      { ar: "طَلَقَ سَراحَ (شَخص)", en: "released (someone)" },
    ],
    mistakes: [],
  },

  "مزج": {
    level_1: { ar: "مَزَجَ اللَّونَينِ.", en: "He mixed the two colors." },
    level_2: { ar: "مَزَجَ الطّاهي التَّوابِلَ مَعَ الصَّلصَةِ.", en: "The chef mixed the spices with the sauce." },
    level_3: { ar: "مَزَجَ الكاتِبُ بَينَ الواقِعِ وَالخَيالِ في رِوايَتِهِ الأَخيرَةِ.", en: "The author blended reality and fiction in his latest novel." },
    patterns: [
      { ar: "مَزَجَ (شَيئًا) بِ / مَعَ (شَيء)", en: "mixed (something) with (something)" },
      { ar: "مَزَجَ بَينَ (شَيئَين)", en: "blended between (two things)" },
    ],
    mistakes: [],
  },

  "طرق": {
    level_1: { ar: "طَرَقَ البابَ.", en: "He knocked on the door." },
    level_2: { ar: "طَرَقَ الزّائِرُ البابَ ثَلاثَ مَرّاتٍ.", en: "The visitor knocked on the door three times." },
    level_3: { ar: "طَرَقَتِ القَضِيَّةُ أَبوابَ المَحاكِمِ الدَّولِيَّةِ بَعدَ فَشَلِ الحُلولِ المَحَلِّيَّةِ.", en: "The case reached the doors of international courts after local solutions failed." },
    patterns: [
      { ar: "طَرَقَ (بابًا)", en: "knocked on (a door)" },
      { ar: "طَرَقَ مَوضوعًا", en: "broached / addressed a topic" },
    ],
    mistakes: [],
  },

  "دفن": {
    level_1: { ar: "دَفَنَ الكَنزَ.", en: "He buried the treasure." },
    level_2: { ar: "دَفَنوا المَيِّتَ في المَقبَرَةِ.", en: "They buried the deceased in the cemetery." },
    level_3: { ar: "دَفَنَ الرَّجُلُ أَحزانَهُ وَعادَ إِلى عَمَلِهِ بِعَزيمَةٍ مُتَجَدِّدَةٍ.", en: "The man buried his sorrows and returned to work with renewed determination." },
    patterns: [
      { ar: "دَفَنَ (شَيئًا / شَخصًا)", en: "buried (something / someone)" },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 9 — 20 verbs (fataha/alima + common)
  // ═══════════════════════════════════════════════

  "ربط": {
    level_1: { ar: "رَبَطَ الحَبلَ.", en: "He tied the rope." },
    level_2: { ar: "رَبَطَ الباحِثُ بَينَ الظّاهِرَتَينِ.", en: "The researcher linked the two phenomena." },
    level_3: { ar: "رَبَطَتِ الدِّراسَةُ بَينَ التَّلَوُّثِ وَارتِفاعِ مُعَدَّلاتِ الأَمراضِ التَّنَفُّسِيَّةِ.", en: "The study linked pollution to rising rates of respiratory diseases." },
    patterns: [
      { ar: "رَبَطَ (شَيئًا) بِ (شَيء)", en: "tied / linked (something) to (something)" },
      { ar: "رَبَطَ بَينَ (شَيئَين)", en: "linked between (two things)" },
    ],
    mistakes: [],
  },

  "لفظ": {
    level_1: { ar: "لَفَظَ الكَلِمَةَ.", en: "He uttered the word." },
    level_2: { ar: "لَفَظَ القاضي الحُكمَ.", en: "The judge pronounced the verdict." },
    level_3: { ar: "لَفَظَ الشّاعِرُ أَبياتَهُ بِنَبرَةٍ مُؤَثِّرَةٍ هَزَّتِ الحُضورَ.", en: "The poet recited his verses in a moving tone that stirred the audience." },
    patterns: [
      { ar: "لَفَظَ (كَلِمَة / حُكمًا)", en: "uttered / pronounced (a word / verdict)" },
      { ar: "لَفَظَ أَنفاسَهُ الأَخيرَةَ", en: "breathed his last" },
    ],
    mistakes: [],
  },

  "صقل": {
    level_1: { ar: "صَقَلَ السَّيفَ.", en: "He polished the sword." },
    level_2: { ar: "صَقَلَ المُعَلِّمُ مَهاراتِ الطُّلّابِ.", en: "The teacher refined the students' skills." },
    level_3: { ar: "صَقَلَتِ التَّجارِبُ شَخصِيَّتَهُ وَجَعَلَتهُ أَكثَرَ نُضجًا.", en: "Experiences refined his personality and made him more mature." },
    patterns: [
      { ar: "صَقَلَ (شَيئًا / مَهارَة)", en: "polished / refined (something / a skill)" },
    ],
    mistakes: [],
  },

  "صنف": {
    level_1: { ar: "صَنَّفَ الكُتُبَ.", en: "He classified the books." },
    level_2: { ar: "صَنَّفَ العالِمُ النَّباتاتِ إِلى عِدَّةِ فُصولٍ.", en: "The scientist classified the plants into several categories." },
    level_3: { ar: "صَنَّفَتِ المُنَظَّمَةُ الدَّولِيَّةُ البَلَدَ ضِمنَ الدُّوَلِ مُنخَفِضَةِ الدَّخلِ.", en: "The international organization classified the country among low-income states." },
    patterns: [
      { ar: "صَنَّفَ (شَيئًا) إِلى / ضِمنَ (فِئَة)", en: "classified (something) into / among (a category)" },
    ],
    mistakes: [],
  },

  "كنس": {
    level_1: { ar: "كَنَسَ الغُرفَةَ.", en: "He swept the room." },
    level_2: { ar: "كَنَسَ العامِلُ الشّارِعَ في الصَّباحِ.", en: "The worker swept the street in the morning." },
    level_3: { ar: "كَنَسَتِ الرِّياحُ القَوِيَّةُ الأَوراقَ المُتَساقِطَةَ مِنَ الطُّرُقاتِ.", en: "Strong winds swept the fallen leaves from the roads." },
    patterns: [
      { ar: "كَنَسَ (مَكانًا)", en: "swept (a place)" },
    ],
    mistakes: [],
  },

  "خنق": {
    level_1: { ar: "خَنَقَهُ الدُّخانُ.", en: "The smoke choked him." },
    level_2: { ar: "خَنَقَتِ الأَزمَةُ الاقتِصادَ المَحَلِّيَّ.", en: "The crisis strangled the local economy." },
    level_3: { ar: "خَنَقَتِ القُيودُ البيروقراطِيَّةُ الابتِكارَ في القِطاعِ الخاصِّ.", en: "Bureaucratic restrictions stifled innovation in the private sector." },
    patterns: [
      { ar: "خَنَقَ (شَخصًا / شَيئًا)", en: "choked / strangled / stifled (someone / something)" },
    ],
    mistakes: [],
  },

  "صمد": {
    level_1: { ar: "صَمَدَ أَمامَ الصُّعوباتِ.", en: "He stood firm against difficulties." },
    level_2: { ar: "صَمَدَ الفَريقُ حَتّى نِهايَةِ المُباراةِ.", en: "The team held firm until the end of the match." },
    level_3: { ar: "صَمَدَتِ العُملَةُ المَحَلِّيَّةُ أَمامَ مَوجَةِ التَّضَخُّمِ بِفَضلِ السِّياساتِ النَّقدِيَّةِ الحَكيمَةِ.", en: "The local currency held firm against the inflation wave thanks to wise monetary policies." },
    patterns: [
      { ar: "صَمَدَ أَمامَ / في وَجهِ (شَيء)", en: "stood firm against / in the face of (something)" },
    ],
    mistakes: [],
  },

  "نفق": {
    level_1: { ar: "نَفَقَ الحَيَوانُ.", en: "The animal died." },
    level_2: { ar: "نَفَقَتِ الأَسماكُ بِسَبَبِ تَلَوُّثِ الماءِ.", en: "The fish died because of water pollution." },
    level_3: { ar: "نَفَقَت أَعدادٌ كَبيرَةٌ مِنَ الماشِيَةِ خِلالَ مَوجَةِ الجَفافِ.", en: "Large numbers of livestock perished during the drought." },
    patterns: [
      { ar: "نَفَقَ (حَيَوان)", en: "(an animal) died / perished" },
    ],
    mistakes: [],
  },

  "جبر": {
    level_1: { ar: "جَبَرَ العَظمَ.", en: "He set the bone." },
    level_2: { ar: "جَبَرَ الطَّبيبُ كَسرَ السّاقِ.", en: "The doctor set the leg fracture." },
    level_3: { ar: "جَبَرَ حُسنُ التَّعامُلِ خاطِرَ المُتَضَرِّرينَ بَعدَ الحادِثِ.", en: "Good treatment consoled those affected after the incident." },
    patterns: [
      { ar: "جَبَرَ (عَظمًا / كَسرًا)", en: "set (a bone / fracture)" },
      { ar: "جَبَرَ خاطِرَ (شَخص)", en: "consoled / comforted (someone)" },
    ],
    mistakes: [],
  },

  "قهر": {
    level_1: { ar: "قَهَرَ عَدُوَّهُ.", en: "He vanquished his enemy." },
    level_2: { ar: "قَهَرَ الرِّياضِيُّ المَرَضَ وَعادَ لِلمُنافَسَةِ.", en: "The athlete overcame the illness and returned to competition." },
    level_3: { ar: "قَهَرَتِ العَزيمَةُ كُلَّ العَقَباتِ الَّتي واجَهَها الفَريقُ.", en: "Determination overcame all the obstacles the team faced." },
    patterns: [
      { ar: "قَهَرَ (شَخصًا / شَيئًا)", en: "vanquished / overcame (someone / something)" },
    ],
    mistakes: [],
  },

  "لمح": {
    level_1: { ar: "لَمَحَ ضَوءًا.", en: "He glimpsed a light." },
    level_2: { ar: "لَمَحَ الرَّجُلُ صَديقَهُ في الزِّحامِ.", en: "The man caught a glimpse of his friend in the crowd." },
    level_3: { ar: "لَمَحَ المُراقِبونَ مُؤَشِّراتٍ إِيجابِيَّةً في الأَداءِ الاقتِصادِيِّ الأَخيرِ.", en: "Observers noticed positive indicators in the latest economic performance." },
    patterns: [
      { ar: "لَمَحَ (شَيئًا / شَخصًا)", en: "glimpsed / noticed (something / someone)" },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 10 — 15 verbs (to reach ~200 total)
  // ═══════════════════════════════════════════════

  "حلق": {
    level_1: { ar: "حَلَقَ ذَقنَهُ.", en: "He shaved his beard." },
    level_2: { ar: "حَلَقَتِ الطّائِرَةُ فَوقَ المَدينَةِ.", en: "The plane circled above the city." },
    level_3: { ar: "حَلَقَ الخَيالُ بَعيدًا في رِوايَتِهِ الأَخيرَةِ.", en: "Imagination soared high in his latest novel." },
    patterns: [
      { ar: "حَلَقَ (ذَقنًا / شَعرًا)", en: "shaved (a beard / hair)" },
      { ar: "حَلَقَ في السَّماءِ", en: "soared / circled in the sky" },
    ],
    mistakes: [],
  },

  "وجل": {
    level_1: { ar: "وَجِلَ مِنَ الامتِحانِ.", en: "He felt anxious about the exam." },
    level_2: { ar: "وَجِلَ الطِّفلُ مِنَ الظَّلامِ.", en: "The child was afraid of the dark." },
    level_3: { ar: "وَجِلَ المُستَثمِرونَ مِن تَقَلُّباتِ السّوقِ المُفاجِئَةِ.", en: "Investors were apprehensive about the sudden market fluctuations." },
    patterns: [
      { ar: "وَجِلَ مِن (شَيء)", en: "was afraid / apprehensive of (something)" },
    ],
    mistakes: [],
  },

  "فزع": {
    level_1: { ar: "فَزِعَ مِنَ الصَّوتِ.", en: "He was startled by the sound." },
    level_2: { ar: "فَزِعَ الأَطفالُ عِندَ سَماعِ الرَّعدِ.", en: "The children were frightened upon hearing the thunder." },
    level_3: { ar: "فَزِعَ السُّكّانُ مِن أَصواتِ الانفِجاراتِ القَريبَةِ.", en: "The residents were terrified by the sounds of nearby explosions." },
    patterns: [
      { ar: "فَزِعَ مِن (شَيء)", en: "was frightened by (something)" },
      { ar: "فَزِعَ إِلى (شَخص / شَيء)", en: "sought refuge in (someone / something)" },
    ],
    mistakes: [],
  },

  "ندب": {
    level_1: { ar: "نَدَبَ المَيِّتَ.", en: "He mourned the deceased." },
    level_2: { ar: "نُدِبَ لِلمُهِمَّةِ الخاصَّةِ.", en: "He was appointed to the special task." },
    level_3: { ar: "نَدَبَتِ الحُكومَةُ لَجنَةً لِلتَّحقيقِ في أَسبابِ الحادِثِ.", en: "The government appointed a committee to investigate the causes of the incident." },
    patterns: [
      { ar: "نَدَبَ (شَخصًا) لِ (مُهِمَّة)", en: "appointed (someone) to (a task)" },
      { ar: "نَدَبَ (مَيِّتًا)", en: "mourned / lamented (a deceased)" },
    ],
    mistakes: [],
  },

  "حشد": {
    level_1: { ar: "حَشَدَ الجُنودَ.", en: "He mobilized the soldiers." },
    level_2: { ar: "حَشَدَ المُنَظِّمونَ آلافَ المُشارِكينَ.", en: "The organizers mobilized thousands of participants." },
    level_3: { ar: "حَشَدَتِ الحَملَةُ دَعمًا شَعبِيًّا واسِعًا خِلالَ أَيّامٍ قَليلَةٍ.", en: "The campaign rallied broad popular support within a few days." },
    patterns: [
      { ar: "حَشَدَ (أَشخاصًا / دَعمًا)", en: "mobilized / rallied (people / support)" },
    ],
    mistakes: [],
  },

  "نبض": {
    level_1: { ar: "نَبَضَ قَلبُهُ.", en: "His heart beat." },
    level_2: { ar: "نَبَضَتِ المَدينَةُ بِالحَياةِ.", en: "The city pulsed with life." },
    level_3: { ar: "نَبَضَ الشّارِعُ بِالحَرَكَةِ مُنذُ ساعاتِ الفَجرِ الأُولى.", en: "The street pulsated with activity from the early dawn hours." },
    patterns: [
      { ar: "نَبَضَ (قَلبٌ)", en: "beat / pulsated (heart)" },
      { ar: "نَبَضَ بِ (حَياة / حَرَكَة)", en: "pulsed with (life / activity)" },
    ],
    mistakes: [],
  },

  // ═══════════════════════════════════════════════
  //  BATCH 11 — 18 verbs (final, to reach 200)
  // ═══════════════════════════════════════════════

  "شهر": {
    level_1: { ar: "شَهَرَ سَيفَهُ.", en: "He drew his sword." },
    level_2: { ar: "شَهَرَ المُحامي وَثيقَةً أَمامَ القاضي.", en: "The lawyer displayed a document before the judge." },
    level_3: { ar: "شُهِرَ الكاتِبُ بِأَعمالِهِ الأَدَبِيَّةِ الَّتي تُرجِمَت إِلى لُغاتٍ عَديدَةٍ.", en: "The writer became famous for his literary works translated into many languages." },
    patterns: [
      { ar: "شَهَرَ (سِلاحًا)", en: "drew / brandished (a weapon)" },
      { ar: "شُهِرَ بِ (شَيء)", en: "became famous for (something)" },
    ],
    mistakes: [],
  },

  "خلد": {
    level_1: { ar: "خَلَدَ إِلى الرّاحَةِ.", en: "He rested." },
    level_2: { ar: "خَلَدَ اسمُهُ في التّاريخِ.", en: "His name was immortalized in history." },
    level_3: { ar: "خَلَدَ الشّاعِرُ ذِكرى وَطَنِهِ في قَصائِدَ لا تُنسى.", en: "The poet immortalized the memory of his homeland in unforgettable poems." },
    patterns: [
      { ar: "خَلَدَ إِلى (راحَة / نَوم)", en: "surrendered to (rest / sleep)" },
      { ar: "خَلَدَ (ذِكرى)", en: "immortalized (a memory)" },
    ],
    mistakes: [],
  },

  "جمد": {
    level_1: { ar: "جَمَدَ الماءُ.", en: "The water froze." },
    level_2: { ar: "جَمَدَتِ الحَرَكَةُ في الشَّوارِعِ بِسَبَبِ العاصِفَةِ.", en: "Movement in the streets froze because of the storm." },
    level_3: { ar: "جَمَدَتِ المُفاوَضاتُ بَعدَ رَفضِ الطَّرَفَينِ تَقديمَ تَنازُلاتٍ.", en: "Negotiations froze after both parties refused to make concessions." },
    patterns: [
      { ar: "جَمَدَ (شَيءٌ)", en: "(something) froze / solidified" },
    ],
    mistakes: [],
  },

  "فلح": {
    level_1: { ar: "فَلَحَ في عَمَلِهِ.", en: "He succeeded in his work." },
    level_2: { ar: "فَلَحَ المُزارِعُ الأَرضَ.", en: "The farmer cultivated the land." },
    level_3: { ar: "فَلَحَ الفَريقُ في إِيجادِ حَلٍّ تِقنِيٍّ لِمُشكِلَةٍ مُعَقَّدَةٍ.", en: "The team succeeded in finding a technical solution to a complex problem." },
    patterns: [
      { ar: "فَلَحَ في (شَيء)", en: "succeeded in (something)" },
      { ar: "فَلَحَ (أَرضًا)", en: "cultivated / plowed (land)" },
    ],
    mistakes: [],
  },

  "نهج": {
    level_1: { ar: "نَهَجَ نَهجًا جَديدًا.", en: "He followed a new approach." },
    level_2: { ar: "نَهَجَتِ المَدرَسَةُ أُسلوبًا حَديثًا في التَّعليمِ.", en: "The school followed a modern method in education." },
    level_3: { ar: "نَهَجَتِ الدَّولَةُ سِياسَةً انفِتاحِيَّةً في تَعامُلِها مَعَ المُجتَمَعِ الدَّولِيِّ.", en: "The state followed an open policy in its dealings with the international community." },
    patterns: [
      { ar: "نَهَجَ (نَهجًا / أُسلوبًا)", en: "followed (an approach / method)" },
    ],
    mistakes: [],
  },

  "مكر": {
    level_1: { ar: "مَكَرَ بِهِ.", en: "He schemed against him." },
    level_2: { ar: "مَكَرَ بِهِ زُمَلاؤُهُ وَخَدَعوهُ.", en: "His colleagues schemed against him and deceived him." },
    level_3: { ar: "مَكَرَ الخُصومُ لِإِسقاطِ المَشروعِ لَكِنَّ خُطَّتَهُم فَشِلَت.", en: "The rivals plotted to bring down the project but their plan failed." },
    patterns: [
      { ar: "مَكَرَ بِ (شَخص)", en: "schemed / plotted against (someone)" },
    ],
    mistakes: [],
  },

  "نقش": {
    level_1: { ar: "نَقَشَ عَلى الحَجَرِ.", en: "He engraved on the stone." },
    level_2: { ar: "نَقَشَ الفَنّانُ رَسمًا عَلى الخَشَبِ.", en: "The artist engraved a design on the wood." },
    level_3: { ar: "نَقَشَتِ الذّاكِرَةُ مَلامِحَ تِلكَ اللَّحظَةِ في وِجدانِهِ إِلى الأَبَدِ.", en: "Memory engraved the features of that moment in his conscience forever." },
    patterns: [
      { ar: "نَقَشَ (شَيئًا) عَلى (سَطح)", en: "engraved (something) on (a surface)" },
    ],
    mistakes: [],
  },

  "رسخ": {
    level_1: { ar: "رَسَخَ في ذِهنِهِ.", en: "It was firmly fixed in his mind." },
    level_2: { ar: "رَسَخَتِ القِيَمُ في نُفوسِ الأَطفالِ.", en: "Values were firmly rooted in the children's hearts." },
    level_3: { ar: "رَسَخَتِ المُؤَسَّسَةُ مَكانَتَها في السّوقِ عَبرَ عُقودٍ مِنَ العَمَلِ الجادِّ.", en: "The institution solidified its position in the market through decades of hard work." },
    patterns: [
      { ar: "رَسَخَ في (ذِهن / نَفس)", en: "was firmly rooted in (mind / soul)" },
    ],
    mistakes: [],
  },

  "برع": {
    level_1: { ar: "بَرَعَ في الرِّياضِيّاتِ.", en: "He excelled in mathematics." },
    level_2: { ar: "بَرَعَتِ الطَّالِبَةُ في العُلومِ وَالأَدَبِ.", en: "The student (f.) excelled in science and literature." },
    level_3: { ar: "بَرَعَ العُلَماءُ العَرَبُ في الطِّبِّ وَالفَلَكِ خِلالَ العُصورِ الوُسطى.", en: "Arab scholars excelled in medicine and astronomy during the Middle Ages." },
    patterns: [
      { ar: "بَرَعَ في (مَجال)", en: "excelled in (a field)" },
    ],
    mistakes: [],
  },

  "حجم": {
    level_1: { ar: "حَجَمَ عَنِ المُشارَكَةِ.", en: "He refrained from participating." },
    level_2: { ar: "حَجَمَ المُستَثمِرونَ عَنِ الدُّخولِ في السّوقِ.", en: "Investors refrained from entering the market." },
    level_3: { ar: "حَجَمَتِ الشَّرِكاتُ عَن تَوظيفِ مَزيدٍ مِنَ العامِلينَ بِسَبَبِ الغُموضِ الاقتِصادِيِّ.", en: "Companies refrained from hiring more workers due to economic uncertainty." },
    patterns: [
      { ar: "حَجَمَ عَن (فِعل)", en: "refrained from / held back from (doing something)" },
    ],
    mistakes: [],
  },

  "نفر": {
    level_1: { ar: "نَفَرَ مِنهُ.", en: "He was repelled by him." },
    level_2: { ar: "نَفَرَ النّاسُ مِنَ الكَذِبِ.", en: "People were repelled by lying." },
    level_3: { ar: "نَفَرَ الجُمهورُ مِنَ الخِطابِ العُنصُرِيِّ وَطالَبوا بِاعتِذارٍ رَسمِيٍّ.", en: "The public was repelled by the racist speech and demanded a formal apology." },
    patterns: [
      { ar: "نَفَرَ مِن (شَيء / شَخص)", en: "was repelled by / recoiled from (something / someone)" },
    ],
    mistakes: [],
  },

  "كبح": {
    level_1: { ar: "كَبَحَ غَضَبَهُ.", en: "He restrained his anger." },
    level_2: { ar: "كَبَحَ السّائِقُ السَّيّارَةَ في اللَّحظَةِ الأَخيرَةِ.", en: "The driver braked the car at the last moment." },
    level_3: { ar: "كَبَحَتِ القَوانينُ الجَديدَةُ الاحتِكارَ في قِطاعِ الاتِّصالاتِ.", en: "The new laws curbed monopoly in the telecommunications sector." },
    patterns: [
      { ar: "كَبَحَ (شُعورًا / سَيّارَة)", en: "restrained / braked (a feeling / car)" },
    ],
    mistakes: [],
  },

  "صبغ": {
    level_1: { ar: "صَبَغَ الجِدارَ.", en: "He painted the wall." },
    level_2: { ar: "صَبَغَتِ المَرأَةُ شَعرَها بِاللَّونِ الأَحمَرِ.", en: "The woman dyed her hair red." },
    level_3: { ar: "صَبَغَتِ الأَحداثُ السِّياسِيَّةُ حَياةَ الجيلِ بِطابَعٍ مِنَ القَلَقِ.", en: "Political events colored the generation's life with a tone of anxiety." },
    patterns: [
      { ar: "صَبَغَ (شَيئًا) بِ (لَون)", en: "dyed / colored (something) with (a color)" },
    ],
    mistakes: [],
  },

  "ذرع": {
    level_1: { ar: "ذَرَعَ الغُرفَةَ.", en: "He paced the room." },
    level_2: { ar: "ذَرَعَ المُفَتِّشُ المَكانَ جَيِّئَةً وَذَهابًا.", en: "The inspector paced the place back and forth." },
    level_3: { ar: "ضاقَ ذَرعُهُ بِالانتِظارِ الطَّويلِ دونَ نَتيجَةٍ.", en: "He ran out of patience with the long wait without result." },
    patterns: [
      { ar: "ذَرَعَ (مَكانًا)", en: "paced / traversed (a place)" },
      { ar: "ضاقَ ذَرعُهُ بِ (شَيء)", en: "ran out of patience with (something)" },
    ],
    mistakes: [],
  },

  "سلب": {
    level_1: { ar: "سَلَبَهُ مالَهُ.", en: "He robbed him of his money." },
    level_2: { ar: "سَلَبَ اللُّصوصُ المُسافِرينَ مُمتَلَكاتِهِم.", en: "The robbers stripped the travelers of their belongings." },
    level_3: { ar: "سَلَبَتِ الحَربُ الأَطفالَ طُفولَتَهُم وَحَرَمَتهُم مِنَ التَّعليمِ.", en: "The war robbed children of their childhood and deprived them of education." },
    patterns: [
      { ar: "سَلَبَ (شَخصًا) (شَيئًا)", en: "robbed / stripped (someone) of (something)" },
    ],
    mistakes: [],
  },

  "جرأ": {
    level_1: { ar: "جَرُؤَ عَلى الكَلامِ.", en: "He dared to speak." },
    level_2: { ar: "جَرُؤَ المُوَظَّفُ عَلى انتِقادِ المُديرِ.", en: "The employee dared to criticize the manager." },
    level_3: { ar: "جَرُؤَ الصَّحَفِيُّ عَلى كَشفِ الفَسادِ رَغمَ التَّهديداتِ.", en: "The journalist dared to expose corruption despite the threats." },
    patterns: [
      { ar: "جَرُؤَ عَلى (فِعل)", en: "dared to (do something)" },
    ],
    mistakes: [],
  },

  "قشر": {
    level_1: { ar: "قَشَرَ التُّفّاحَةَ.", en: "He peeled the apple." },
    level_2: { ar: "قَشَرَتِ الأُمُّ البَطاطا لِلطَّبخِ.", en: "The mother peeled the potatoes for cooking." },
    level_3: { ar: "قَشَرَ الباحِثُ طَبَقاتِ المَوضوعِ لِيَصِلَ إِلى جَوهَرِ القَضِيَّةِ.", en: "The researcher peeled back the layers of the subject to reach the core of the issue." },
    patterns: [
      { ar: "قَشَرَ (شَيئًا)", en: "peeled / shelled (something)" },
    ],
    mistakes: [],
  },

  "ركم": {
    level_1: { ar: "رَكَمَ الحِجارَةَ.", en: "He piled up the stones." },
    level_2: { ar: "رَكَمَ التّاجِرُ ثَروَةً كَبيرَةً.", en: "The merchant accumulated a large fortune." },
    level_3: { ar: "رَكَمَتِ السُّلُطاتُ دُيونًا هائِلَةً أَثقَلَت كاهِلَ الأَجيالِ القادِمَةِ.", en: "The authorities accumulated enormous debts that burdened future generations." },
    patterns: [
      { ar: "رَكَمَ (شَيئًا)", en: "piled up / accumulated (something)" },
    ],
    mistakes: [],
  },

};

