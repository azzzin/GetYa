import { assetUrl } from '../assetUrl.js';

export default function GameLogo() {
  return <img className="game-logo" src={assetUrl('/assets/get-ya-logo.svg')}
    width={234} height={43} alt="Get-Ya!" draggable={false} />;
}
