const Social = require("../model/socialModel")
const Friend = require("../model/friendModel")
const Dynamic = require("../model/dynamicModel")
const User = require("../model/userModel")

const { verifyToken } = require("../tool/token")

exports.acquire = async data => {
    let { token } = data
    let tokenRes = verifyToken(token)
    let social = await Social.findOne({ userID: tokenRes.id })
    let tokenUser = await User.findById(tokenRes.id)
    if (social) {
        let dynamicList = social.dynamicList
        if (dynamicList.length == 0) {  //
            return {
                dynamicList
            }
        } else {
            let result = await Friend.findOne({ userID: tokenRes.id }).populate("friend_list.user", "avatars")
            if (result) {
                let friend_list = result.friend_list
                let oldDynamicList = []
                let mapRes = await Promise.all(dynamicList.map(async item => {
                    let obj = {}
                    let index = friend_list.findIndex(item2 => { //在好友表中查找并获取好友信息（昵称和用户头像）
                        return item2.user._id == item.friend
                    })

                    if (index > -1) { //是好友
                        let friend = friend_list[index]
                        obj.avatars = friend.user.avatars
                        obj.id = friend.user._id
                        obj.nickName = friend.nickName
                    } else {//是用户自己
                        obj.avatars = tokenUser.avatars
                        obj.id = tokenUser._id
                        obj.nickName = tokenUser.name
                    }
                    let f_dynamic = await Dynamic.findOne({ userID: item.friend })
                    let logIndex = f_dynamic.logList.findIndex(item3 => { //查找动态
                        // 根据时间查找
                        return new Date(item3.date).getTime() == new Date(item.date).getTime()
                    })
                    let like = []
                    // 遍历点赞，在朋友中寻找，不是好友关系则屏蔽
                    f_dynamic.logList[logIndex].like.map(item4 => {
                        if (item4.id == tokenRes.id) {
                            item4.nickName = tokenUser.name
                            like.push(item4)
                        } else {
                            friend_list.map(item5 => {
                                if (item5.user._id.toString() == item4.id.toString()) {
                                    item4.nickName = item5.nickName
                                    like.push(item4)
                                }
                            })
                        }
                    })
                    f_dynamic.logList[logIndex].like = like
                    obj.log = f_dynamic.logList[logIndex]
                    oldDynamicList.push(obj)
                    // console.log(newDynamicList)
                    return item
                }))
                // 排序（因为以上map遍历以及内嵌了await 导致执行顺序会乱）
                function listSort(a, b) {
                    return new Date(b.log.date).getTime() - new Date(a.log.date).getTime()
                }
                let newDynamicList = oldDynamicList.sort(listSort)


                return newDynamicList
            } else {
                return {
                    dynamicList
                }
            }
        }
    } else { //social不存在直接返回
        return {
            dynamicList: []
        }
    }
}