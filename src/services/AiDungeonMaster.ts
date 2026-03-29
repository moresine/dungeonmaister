export class AiDungeonMaster {
  private step = 0;

  public async getResponse(userInput: string, diceResult?: number): Promise<string> {
    // Simulate network delay to act as an LLM processing time
    await new Promise(res => setTimeout(res, 1500));

    // Simple robust mock state machine for the tutorial
    if (this.step === 0) {
      this.step++;
      return '*The old wizard smiles warmly, his eyes twinkling in the firelight.* Splendid! Let us begin. In Dungeons & Dragons, your destiny is constantly guided by the roll of a twenty-sided die, known as a D20. Let us test it now. Roll a D20 and tell me the result, either by using the virtual dice or by casting your physical dice.';
    }

    if (this.step === 1) {
      const numFromText = parseInt(userInput.match(/\b([1-9]|1[0-9]|20)\b/)?.[0] || '0');
      const num = diceResult || (numFromText > 0 ? numFromText : null);

      if (num) {
        this.step++;
        if (num >= 15) {
          return `*He claps his hands together enthusiastically.* A ${num}! A magnificent roll! The fates favor you. This is how you conquer challenges. When you attempt an action—like leaping a chasm or striking a goblin—you roll the D20 and add your modifiers. The higher the number, the greater your success. You are a natural! Ready to forge your first hero?`;
        } else if (num >= 10) {
          return `*He nods slowly.* A ${num}. A respectable outcome. Not every attempt is a resounding triumph, but neither is it a failure. Usually, you aim to meet or beat a target number called a Difficulty Class. Shall we proceed to creating your character now?`;
        } else {
          return `*The wizard chuckles gently.* Ah, a mere ${num}. Do not be disheartened! Failure is the greatest teacher. In D&D, low rolls lead to interesting complications and dramatic twists in our tale. Are you ready to forge your actual hero?`;
        }
      } else {
        return '*He tilts his head.* I did not catch a number. Please, go ahead and roll the D20 using the dice icon in the corner, or tell me the exact number you rolled on your physical dice.';
      }
    }

    if (this.step === 2) {
      if (userInput.toLowerCase().includes('yes') || userInput.toLowerCase().includes('ready') || userInput.toLowerCase().includes('character')) {
        this.step++;
        return 'Excellent. Return to the tavern menu and select "Character Hub" to forge your hero. Once you have a character, our true adventure will begin... *He fades into a swirl of magical mist.*';
      }
      return 'When you are ready, simply tell me, or head back to the tavern menu manually.';
    }

    return '*The wizard has departed for now.* (End of tutorial scenario)';
  }
}

export const dmInstance = new AiDungeonMaster();
