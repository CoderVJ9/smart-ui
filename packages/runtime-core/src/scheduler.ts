const queue: Function[] = [];

let isFlushing = false;
const resolvePromise = Promise.resolve();
export function queueJob(job: Function) {
  if (queue.indexOf(job) === -1) {
    //不存在
    queue.push(job);
  }
  if (!isFlushing) {
    isFlushing = true;

    // 如果不用isFlushing 值 , 那么就会导致 进来一次queueJob 就会执行下面的then方法.但是第一次queue是1个值, 第二次是0个值, 虽然目前看没有影响执行结果,但是还是执行了2次
    resolvePromise.then(() => {
      isFlushing = false;
      // 开始执行
      const copy = queue.slice(0);
      queue.length = 0;

      copy.forEach((job) => job());
    });
  }
}
