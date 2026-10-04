import http from "k6/http";
import {check} from "k6";
const shortCodes=JSON.parse(open("./test-shortCode.json"));

const BASE_URL = "http://localhost:3000";
const TEST_USERS=100;
const TEST_DURATION="60s"

export const options={
    scenarios:{
        redirect_test:{
            executor:"constant-vus",
            vus:TEST_USERS,
            duration:TEST_DURATION,
        },
    },
    thresholds:{
        http_req_failed: ["rate<0.01"],
        http_req_duration: ["p(95)<100"],
    },
};

export default function(){
    const code = shortCodes[Math.floor(Math.random()*shortCodes.length)];
    const res=http.get(`${BASE_URL}/api/get/${code}`,{
        redirects:0,
    });
    check(res,{
        "status is 302":(r)=> r.status===302,
    });
}
