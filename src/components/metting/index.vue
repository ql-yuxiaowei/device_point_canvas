<template>
  <div class="metting-container" v-loading="loading">
    <audio-recorder ref="audioRecorder" />
    <img src="@/assets/images/tonghua.png" alt="lang" style="width:20vh;">
    <div style="color: #333;">{{errorMsg}}</div>
    <img v-if="!!joined" @click="stopVoice()" src="@/assets/images/guaduan.png" alt="lang" style="width:10vh;cursor: pointer;">
    <img v-else src="@/assets/images/guaduan1.png" alt="lang" style="width:10vh;cursor: pointer;">
    <div v-show="false" class="mt-10">
      <agora-video-player :isLocal="true" :audioTrack="audioTrack"></agora-video-player>
      <agora-video-player v-for="item in remoteUsers" :key="item.uid" :audioTrack="item.audioTrack" :text="item.uid"></agora-video-player>
    </div>
  </div>
</template>

<script>
// import {startVoice, stopVoice} from "@/api/radar/alarm";
import AgoraRTC from "agora-rtc-sdk-ng"
import AgoraVideoPlayer from "@/components/AgoraVideoPlayer"
import AudioRecorder from '@/components/AudioRecorder'

var client = null;
export default {
  name: "Metting",
  components: { 
    AgoraVideoPlayer, AudioRecorder,
  },
  data() {
    return {
      // wifi语音通话
      loading: false,
      joined: false,
      remoteUsers: {},
      audioTrack: null,
      config: {},
      invoke: true, // 是否需要通知设备退出通话
      errorMsg: this.$t('接通中'),
      stopTimer: null,
      isRecord: false, // 是否开启录音功能
    };
  },
  props: {
    uid: String,
    eqtTypeId: {
      type: String,
      default: null
    },
  },
  async created() {
    client = AgoraRTC.createClient({
      mode: "live",
      codec: "h264",
      audioCodec: "g722",
    });
    this.invoke = true;
    console.log("=========页面初始化created=========");
    this.startVoice();
  },
  mounted() {
    window.addEventListener("beforeunload", this.beforeUnloadHandler, false)
  },
  destroyed() {
    window.removeEventListener("beforeunload", this.beforeUnloadHandler, false)
  },
  beforeDestroy() {
    if(this.joined) {
      this.stopVoice();
    }
  },
  methods: {
    beforeUnloadHandler(e) {
      window.localStorage.setItem("closeVoice", this.uid);
    },
    // wifi语音通话模块方法
    startVoice() {
      this.loading = true;
      console.log("=========1、startVoice=========");
      let params = {
        uid: this.uid,
        eqtTypeId: this.eqtTypeId || null,
      };
      startVoice(params, true).then((res) => {
        if (res.code != 200) {
          console.log("=========startVoice error=========");
          this.errorMsg = this.$t('呼叫失败，请稍后重试');
          window.setTimeout(() => {
            this.$emit('metting-event', '')
          }, 3000);
          return
        }
        console.log("=========startVoice success=========", res);
        this.startVoiceObj = res;
        this.startTrack(res.appId, res.token, this.uid);
        // 根据isRecord参数决定是否开始录音
        if (this.isRecord) {
          this.$nextTick(() => {
            // 等待远程用户加入后再开始录音
            this.waitForRemoteUserAndRecord();
          });
        }
      }).catch(err => {
        this.errorMsg = this.$t('呼叫失败，请稍后重试');
        this.$emit('metting-event', '')
        this.loading = false;
      });
		},
    startTrack(appId, token, channelId) {
      this.config = {
        appId, token, channelId,
        uid: parseInt(Math.random() * 1000000),
        stringUid: 'dsadas'
      }
      // console.log('当前的配置', this.config)
      this.errorMsg = this.$t('接通中');
      this.joined = true
      this.loading = false;
      this.joinTrack();
    },
    stopVoice() {
      this.loading = true;
      
      return new Promise((resolve, reject) => {
        window.setTimeout(() => {
          let params = {
            uid: this.uid,
            eqtTypeId: this.eqtTypeId || null,
            lisenseKey: this.startVoiceObj?.lisenseKey, invoke: this.invoke,
          };
          stopVoice(params)
            .then((res) => {
              if (res.code !== 200) {
                this.errorMsg = this.$t('通道关闭异常');
                reject(new Error('通道关闭异常'));
              } else {
                resolve();
              }
            })
            .catch((err) => {
              reject(err);
            })
            .finally(() => {
              this.stopTrack();
              // 根据isRecord参数决定是否停止录音和保存录音
              this.$nextTick(() => {
                if (this.isRecord) {
                  this.$refs.audioRecorder?.stopRecording();
                  // 等待录音完全停止后再保存
                  setTimeout(() => {
                    this.$refs.audioRecorder?.saveRecording();
                    this.joined = false
                    this.$emit('metting-event', '');
                    this.loading = false;
                  }, 1000);
                } else {
                  this.joined = false
                  this.$emit('metting-event', '');
                  this.loading = false;
                }
              });
            });
        }, 3000);
      });
		},
    stopTrack() {
      this.config = {};
      this.leaveTrack();
    },
    async joinTrack() {
      this.stopTimer && window.clearTimeout(this.stopTimer);
      this.stopTimer = window.setTimeout(() => {
        console.log('============3、设备未应答，5s没检测到设备加入===========');
        if(this.remoteUsers.length > 1) {
          return
        }
        this.errorMsg = this.$t('呼叫没有应答，请耐心等待或稍后重试');
        this.$modal.msgError(this.$t('呼叫没有应答，请耐心等待或稍后重试'));
      }, 10000);
      client.on("user-published", this.handleUserPublished)
      client.on("user-unpublished", this.handleUserUnpublished);
      client.on("user-joined", (user) => {
        this.errorMsg = this.$t('正在通话中');
        console.log('============3、user-joined===========', user);
        // console.log('user-joined===', user);
        this.stopTimer && window.clearTimeout(this.stopTimer);
      })
      client.on("user-left", async(user, reason) => {
        console.log('============3、user-left===========', user, reason);
        // console.log('user-left===', user, reason);
        if(reason == 'ServerTimeOut') {
          this.errorMsg = this.$t('设备已挂断');
          this.$modal.msgError(this.$t('设备已挂断'));
          this.invoke = false;
          this.stopVoice();
        }
      })
      client.on("token-privilege-will-expire", () => {
        console.log('============3、token-privilege-will-expire===========');
        console.log('token-privilege-will-expire===');
      })
      client.on("token-privilege-did-expire", () => {
        console.log('============3、token-privilege-did-expire===========');
        this.errorMsg = this.$t('授权已过期，请重新加入频道');
        this.$modal.msgError(this.$t('授权已过期，请重新加入频道'));
        this.stopVoice();
      })
        client.setClientRole('host');
        await client.join(this.config.appId, this.config.channelId, this.config.token || null, this.config.uid || null)
        await this.initTrack()
        await client.publish([this.audioTrack])
        console.log("=========2、joinTrack=========");
    },
    async leaveTrack() {
      if (this.audioTrack) {
        this.audioTrack.stop()
        this.audioTrack.close()
        this.audioTrack = null
      }
      this.remoteUsers = {}
      await client.leave()
      this.joined = false
      console.log("=========4、leaveTrack=========");
      this.errorMsg = this.$t('通话已结束');
    },
    async initTrack() {
      this.audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
    },
    async handleUserPublished(user, mediaType) {
      console.log('============3、user-published===========',user);
      await client.subscribe(user, mediaType)
      if (mediaType === "audio") {
        user.audioTrack.play();
        // 如果开启了录音，开始录制本地麦克风和远程音频（设备端声音）
        if (this.isRecord && !this.$refs.audioRecorder?.isRecording) {
          console.log('远程用户发布音频，开始录制本地麦克风和设备端声音');
          this.$refs.audioRecorder?.startRecording(user.audioTrack);
        }
      }
      delete this.remoteUsers[user.uid]
      this.remoteUsers[user.uid] = user
    },
    
    async waitForRemoteUserAndRecord() {
      // 等待远程用户加入并开始录音
      const checkInterval = setInterval(() => {
        const remoteUserKeys = Object.keys(this.remoteUsers);
        if (remoteUserKeys.length > 0) {
          // 找到远程用户
          const remoteUser = this.remoteUsers[remoteUserKeys[0]];
          if (remoteUser && remoteUser.audioTrack && !this.$refs.audioRecorder?.isRecording) {
            clearInterval(checkInterval);
            console.log('远程用户已加入，开始录制本地麦克风和设备端声音');
            this.$refs.audioRecorder?.startRecording(remoteUser.audioTrack);
          }
        }
      }, 500);
      
      // 30秒后超时，如果还没有远程用户则停止检查
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.$refs.audioRecorder?.isRecording) {
          console.warn('等待远程用户超时，未开始录音');
        }
      }, 30000);
    },
    handleUserUnpublished(user, mediaType) {
      console.log('============3、user-unpublished===========',user);
      delete this.remoteUsers[user.uid]
    },
  },
};
</script>


<style lang='scss' scoped>
.metting-container {
  background: #e0c3fc;
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: space-around;
}
</style>
