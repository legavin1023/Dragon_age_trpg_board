<template>
  <div
    class="spoiler-block"
    :class="{ blurred: isBlurred }"
    @click="toggleBlur"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { ref } from "vue";

const isBlurred = ref(true);
const toggleBlur = () => {
  isBlurred.value = !isBlurred.value;
};
</script>

<style scoped>
.spoiler-block {
  cursor: pointer;
  transition: filter 0.3s ease;
}
.spoiler-block.blurred {
  filter: blur(7px);
}
.spoiler-block:hover {
  filter: blur(0px); /* 블러 제거 */
}
</style>
