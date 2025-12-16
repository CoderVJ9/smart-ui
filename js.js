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

console.log("==     ", getSequence([2, 3, 1, 5, 6, 8, 7, 9, 4]));
