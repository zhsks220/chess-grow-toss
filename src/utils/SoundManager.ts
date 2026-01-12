import { Howl, Howler } from 'howler';

// Sound Assets
import bgmCasualOgg from '../assets/sounds/bgm_casual.ogg';
import bgmCasualMp3 from '../assets/sounds/bgm_casual.mp3';
import seHit from '../assets/sounds/se_hit.wav';
import seDestroy from '../assets/sounds/se_destroy.wav';
import seCoin from '../assets/sounds/se_coin.wav';
import seSuccess from '../assets/sounds/se_enhance_success.wav';
import seFail from '../assets/sounds/se_enhance_fail.wav';
import seClick from '../assets/sounds/se_ui_click.wav';

type SoundType = 'bgm' | 'hit' | 'destroy' | 'coin' | 'success' | 'fail' | 'click';

const STORAGE_KEY = 'pony-game-sound-settings';

interface SoundSettings {
    bgmMuted: boolean;
    sfxMuted: boolean;
    bgmVolume: number;
    sfxVolume: number;
}

class SoundManager {
    private bgm: Howl;
    private sounds: Record<Exclude<SoundType, 'bgm'>, Howl>;
    private bgmMuted: boolean = false;
    private sfxMuted: boolean = false;
    private bgmVolume: number = 0.3;
    private sfxVolume: number = 0.5;
    private bgmPlaying: boolean = false;
    private bgmLoaded: boolean = false;
    private pendingBgmPlay: boolean = false;
    private audioUnlocked: boolean = false;

    constructor() {
        // BGM 설정 (OGG 우선, MP3 백업 - 더 작은 용량과 끊김없는 루프)
        // html5: true 제거 - Web Audio API 사용으로 자동재생 문제 해결 시도
        this.bgm = new Howl({
            src: [bgmCasualOgg, bgmCasualMp3],
            loop: true,
            volume: this.bgmVolume,
            preload: true,
            onload: () => {
                this.bgmLoaded = true;
                // 로드 완료 시 대기 중인 재생 요청 처리
                if (this.pendingBgmPlay && !this.bgmMuted && this.audioUnlocked) {
                    this.bgm.play();
                    this.bgmPlaying = true;
                    this.pendingBgmPlay = false;
                }
            },
        });

        // SFX 설정 (Web Audio API - 빠른 재생, 낮은 지연)
        this.sounds = {
            hit: new Howl({
                src: [seHit],
                volume: this.sfxVolume,
                preload: true,
                pool: 5, // 동시 재생 가능 수
            }),
            destroy: new Howl({
                src: [seDestroy],
                volume: this.sfxVolume,
                preload: true,
                pool: 3,
            }),
            coin: new Howl({
                src: [seCoin],
                volume: this.sfxVolume,
                preload: true,
                pool: 4,
            }),
            success: new Howl({
                src: [seSuccess],
                volume: this.sfxVolume,
                preload: true,
                pool: 2,
            }),
            fail: new Howl({
                src: [seFail],
                volume: this.sfxVolume,
                preload: true,
                pool: 2,
            }),
            click: new Howl({
                src: [seClick],
                volume: this.sfxVolume,
                preload: true,
                pool: 3,
            }),
        };

        // 저장된 설정 로드
        this.loadSettings();
    }

    private loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const settings: SoundSettings = JSON.parse(saved);
                this.bgmMuted = settings.bgmMuted ?? false;
                this.sfxMuted = settings.sfxMuted ?? false;
                this.bgmVolume = settings.bgmVolume ?? 0.3;
                this.sfxVolume = settings.sfxVolume ?? 0.5;

                // 볼륨 적용
                this.bgm.volume(this.bgmVolume);
                this.updateSfxVolumes();
            }
        } catch (e) {
            console.error('Failed to load sound settings:', e);
        }
    }

    private saveSettings() {
        const settings: SoundSettings = {
            bgmMuted: this.bgmMuted,
            sfxMuted: this.sfxMuted,
            bgmVolume: this.bgmVolume,
            sfxVolume: this.sfxVolume,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    private updateSfxVolumes() {
        Object.values(this.sounds).forEach(sound => {
            sound.volume(this.sfxVolume);
        });
    }

    play(type: SoundType) {
        if (type === 'bgm') {
            if (this.bgmMuted) return;
            if (!this.bgmPlaying) {
                if (this.bgmLoaded) {
                    // 이미 로드됨 - 즉시 재생
                    this.bgm.play();
                    this.bgmPlaying = true;
                } else {
                    // 아직 로딩 중 - 로드 완료 시 재생하도록 예약
                    this.pendingBgmPlay = true;
                }
            }
            return;
        }

        // SFX
        if (this.sfxMuted) return;
        this.sounds[type].play();
    }

    stopBgm() {
        this.bgm.stop();
        this.bgmPlaying = false;
    }

    // BGM 음소거 토글
    toggleBgmMute(): boolean {
        this.bgmMuted = !this.bgmMuted;
        if (this.bgmMuted) {
            this.bgm.pause();
        } else {
            if (this.bgmPlaying) this.bgm.play();
        }
        this.saveSettings();
        return this.bgmMuted;
    }

    // SFX 음소거 토글
    toggleSfxMute(): boolean {
        this.sfxMuted = !this.sfxMuted;
        this.saveSettings();
        return this.sfxMuted;
    }

    // 전체 음소거 토글 (기존 호환)
    toggleMute(): boolean {
        const newMuted = !this.bgmMuted || !this.sfxMuted;
        this.bgmMuted = newMuted;
        this.sfxMuted = newMuted;
        if (this.bgmMuted) {
            this.bgm.pause();
        } else {
            if (this.bgmPlaying) this.bgm.play();
        }
        this.saveSettings();
        return newMuted;
    }

    // BGM 볼륨 설정 (0 ~ 1)
    setBgmVolume(volume: number) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        this.bgm.volume(this.bgmVolume);
        this.saveSettings();
    }

    // SFX 볼륨 설정 (0 ~ 1)
    setSfxVolume(volume: number) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateSfxVolumes();
        this.saveSettings();
    }

    // Getters
    isBgmMuted(): boolean {
        return this.bgmMuted;
    }

    isSfxMuted(): boolean {
        return this.sfxMuted;
    }

    getBgmVolume(): number {
        return this.bgmVolume;
    }

    getSfxVolume(): number {
        return this.sfxVolume;
    }

    // 전체 오디오 컨텍스트 음소거 (앱 백그라운드 시 유용)
    muteAll() {
        Howler.mute(true);
    }

    unmuteAll() {
        Howler.mute(false);
    }

    // HTML5 오디오 잠금해제 (유저 터치 시 호출)
    unlockAudio(): boolean {
        if (this.audioUnlocked) return true;

        try {
            // HTML5 Audio 직접 잠금해제
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sounds = (this.bgm as any)._sounds;
            if (sounds && sounds[0] && sounds[0]._node) {
                const node = sounds[0]._node as HTMLAudioElement;
                // 짧게 재생했다 멈추면 잠금해제됨
                node.play().then(() => {
                    node.pause();
                    node.currentTime = 0;
                    this.audioUnlocked = true;

                    // 대기 중인 재생 요청 처리
                    if (this.pendingBgmPlay && !this.bgmMuted) {
                        this.bgm.play();
                        this.bgmPlaying = true;
                        this.pendingBgmPlay = false;
                    }
                }).catch(() => {
                    // 잠금해제 실패 - 다음 터치에서 재시도
                });
            }

            // Web Audio Context도 함께 잠금해제
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }

            this.audioUnlocked = true;
            return true;
        } catch (e) {
            console.error('Audio unlock failed:', e);
            return false;
        }
    }

    // BGM이 실제로 재생 중인지 확인
    isBgmActuallyPlaying(): boolean {
        return this.bgmPlaying && this.bgm.playing();
    }

    // 오디오 잠금해제 여부 확인
    isAudioUnlocked(): boolean {
        return this.audioUnlocked;
    }
}

export const soundManager = new SoundManager();
