/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Re-export GSAP + plugins to avoid TypeScript casing errors
// https://github.com/greensock/GSAP/issues/619
export {default as gsap} from 'gsap'
export {Draggable} from 'gsap/Draggable'
export {InertiaPlugin} from 'gsap/InertiaPlugin'
