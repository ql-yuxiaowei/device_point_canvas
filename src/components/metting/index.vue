<template>
  <div class="metting-container" v-loading="loading">
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
import { Message } from "element-ui";
import axios from 'axios'
import AgoraRTC from "agora-rtc-sdk-ng"
import AgoraVideoPlayer from "@/components/AgoraVideoPlayer"

var client = null;
export default {
  name: "Metting",
  components: { 
    AgoraVideoPlayer,
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
      errorMsg: '接通中',
      stopTimer: null,
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
      axios.post(`/prod-api/startVoice?uid=${this.uid}`, {}).then((res) => {
        if (res.data.code != 200) {
          console.log("=========startVoice error=========");
          this.errorMsg = '呼叫失败，请稍后重试';
          window.setTimeout(() => {
            this.$emit('metting-event', '')
          }, 3000);
          return
        }
        console.log("=========startVoice success=========", res.data);
        this.startVoiceObj = res.data.data;
        this.startTrack(res.data.data.appId, res.data.data.token, this.uid);
      }).catch(() => {
        this.errorMsg = '呼叫失败，请稍后重试';
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
      this.errorMsg = '接通中';
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
            licenseKey: this.startVoiceObj?.licenseKey, invoke: this.invoke,
          };
          axios.post(`/prod-api/stopVoice?uid=${this.uid}&licenseKey=${this.startVoiceObj?.licenseKey}`, {}).then((res) => {
            if (res.data.code !== 200) {
                this.errorMsg = '通道关闭异常';
                reject(new Error('通道关闭异常'));
              } else {
                resolve();
              }
          }).catch(() => {
            reject(err);
          }).finally(() => {
            this.stopTrack();
            this.$nextTick(() => {
              this.joined = false
              this.$emit('metting-event', '');
              this.loading = false;
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
        this.errorMsg = '呼叫没有应答，请耐心等待或稍后重试';
        Message.error('呼叫没有应答，请耐心等待或稍后重试');
      }, 10000);
      client.on("user-published", this.handleUserPublished)
      client.on("user-unpublished", this.handleUserUnpublished);
      client.on("user-joined", (user) => {
        this.errorMsg = '正在通话中';
        console.log('============3、user-joined===========', user);
        // console.log('user-joined===', user);
        this.stopTimer && window.clearTimeout(this.stopTimer);
      })
      client.on("user-left", async(user, reason) => {
        console.log('============3、user-left===========', user, reason);
        // console.log('user-left===', user, reason);
        if(reason == 'ServerTimeOut') {
          this.errorMsg = '设备已挂断';
          Message.error('设备已挂断');
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
        this.errorMsg = '授权已过期，请重新加入频道';
        Message.error('授权已过期，请重新加入频道');
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
      this.errorMsg = '通话已结束';
    },
    async initTrack() {
      this.audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
    },
    async handleUserPublished(user, mediaType) {
      console.log('============3、user-published===========',user);
      await client.subscribe(user, mediaType)
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
      delete this.remoteUsers[user.uid]
      this.remoteUsers[user.uid] = user
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
