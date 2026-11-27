import { mountTelegram, readyTelegram, syncTelegramBack } from './adapter';

/** На демо-страницах внутри Telegram показываем системную кнопку «Назад» к кейсу. */
export function startDemoInTelegram(casePath: string) {
  const back = () => {
    if (history.length > 1) history.back();
    else location.assign(casePath);
  };
  void mountTelegram(false, back).then(() => {
    syncTelegramBack(true);
    readyTelegram();
  });
}
