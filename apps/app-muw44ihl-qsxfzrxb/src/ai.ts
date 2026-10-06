import { getAppContext } from "@zijinhua/app-sdk";
import { Transaction } from "./store";

export async function parseMultipleTransactions(
  text: string
): Promise<Omit<Transaction, "id" | "date">[] | null> {
  const ctx = getAppContext();
  const systemPrompt = `你是一个智能记账助手。请从用户的输入中提取出多笔账单记录。
必须返回一个符合以下 TypeScript 类型的 JSON 数组：
Array<{
  type: "expense" | "income";
  amount: number;
  category: string;
  note: string;
}>

注意：
- type 只能是 expense 或 income
- amount 必须是正数
- category 尽量简短（如：餐饮、交通、购物、工资等）
- note 提取出具体说明，没有则为空字符串
- 不要输出除 JSON 之外的任何内容，不要使用 markdown 格式包裹，只输出纯 JSON 字符串。
`;

  try {
    const res = await ctx.ai.complete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.1,
    });

    if (res.ok) {
      let content = res.text.trim();
      // Remove possible markdown formatting
      if (content.startsWith("```json")) {
        content = content.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (content.startsWith("```")) {
        content = content.replace(/^```/, "").replace(/```$/, "").trim();
      }

      return JSON.parse(content);
    }
  } catch (e) {
    console.error("AI parsing error", e);
  }
  return null;
}

export async function askDataQuestion(
  question: string,
  transactions: Transaction[]
): Promise<string> {
  const ctx = getAppContext();

  const ctxData = transactions.slice(0, 100).map(t =>
    `[${new Date(t.date).toLocaleString()}] ${t.type === 'expense' ? '支出' : '收入'} ${t.amount}元, 分类: ${t.category}, 备注: ${t.note}`
  ).join("\n");

  const systemPrompt = `你是一个个人财务分析助手。用户会向你提问关于他账单数据的问题。
以下是用户的历史账单数据：
${ctxData || "暂无数据"}

请根据以上数据回答用户的问题。回答要简明扼要，可以直接给出统计结果或建议。
`;

  try {
    const res = await ctx.ai.complete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      temperature: 0.3,
    });

    if (res.ok) {
      return res.text;
    } else {
      return "AI 分析失败，错误码：" + res.code;
    }
  } catch (e) {
    console.error("AI question error", e);
    return "系统错误，请重试";
  }
}
