import { createRouter, createWebHashHistory } from 'vue-router';

const Home = () => import('../views/Home.vue');
const Upload = () => import('../views/Upload.vue');
const Detail = () => import('../views/Detail.vue');
const Timeline = () => import('../views/Timeline.vue');

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/upload', name: 'upload', component: Upload },
    { path: '/detail/:id?', name: 'detail', component: Detail, props: true },
    { path: '/timeline', name: 'timeline', component: Timeline },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;

