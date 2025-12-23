function getSequence(arr) {
  const len = arr.length;

  const res = [0];

  //   用一个数组记录  每一位的前面的index是多少
  const tail = new Array(len).fill(undefined);
  let start;
  let end;
  let mid;
  for (let i = 0; i < len; i++) {
    const num = arr[i];
    if (num > arr[res[res.length - 1]]) {
      res.push(i);
      tail[i] = res[res.length - 2];
    } else {
      start = 0;
      end = res.length - 1;
      while (start < end) {
        mid = (start + end) >> 1;
        if (arr[res[mid]] < num) {
          start = mid + 1;
        } else {
          end = mid;
        }
      }
      res[start] = i;
      tail[i] = res[start - 1];
    }
  }

  const ans = [res[res.length - 1]];
  let preIndex = tail[ans[0]];
  while (preIndex !== undefined) {
    ans.unshift(preIndex);
    preIndex = tail[preIndex];
  }

  return ans;
}

let count = 0;
function loader() {
  return new Promise((resolve, reject) => {
    console.log("请求一次", count);
    count++;
    if (count >= 4) {
      resolve(1);
    } else {
      reject(2);
    }
  });
}

function load() {
  return loader().catch((err) => {
    return new Promise((resolve) => {
      resolve(load());
    });
  });
}

load()
  .then((res) => {
    console.log("res", res);
  })
  .catch((err) => {
    console.log("err", err);
  });
