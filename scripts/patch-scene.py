p='dist/scene.js'
s=open(p,encoding='utf-8').read()
old=" camera=entity('a-camera',{id:'visitor-camera',position:'0 1.65 0','look-controls':'pointerLockEnabled: false; touchEnabled: true','wasd-controls':'acceleration: 16','gp-bounds':''},rig);"
new=("  camera=entity('a-camera',{id:'visitor-camera',position:'0 2.0 -3.5',rotation:'15 0 0','look-controls':'pointerLockEnabled: false; touchEnabled: true','wasd-controls':'acceleration: 16','gp-bounds':''},rig);\n"
     "  const visitorAvatar=entity('a-entity',{id:'visitor-avatar',position:'0 -2.0 3.5'},camera);\n"
     "  entity('a-cylinder',{position:'0 0.9 0',radius:0.35,height:1.8,color:'#233e34'},visitorAvatar);\n"
     "  entity('a-sphere',{position:'0 2.0 0',radius:0.32,color:'#c99a73'},visitorAvatar);\n"
     "  entity('a-box',{position:'0 0.15 0',width:0.5,height:0.12,depth:0.7,color:'#3a2a1a'},visitorAvatar);")
assert old in s, 'old not found'
s=s.replace(old,new)
# Update goTo camera position
s=s.replace(" rig.setAttribute('position',point.join(' '));rig.setAttribute('rotation',`0 ${yaw} 0`);camera.setAttribute('position','0 1.65 0');",
            " rig.setAttribute('position',point.join(' '));rig.setAttribute('rotation',`0 ${yaw} 0`);camera.setAttribute('position','0 2.0 -3.5');camera.setAttribute('rotation','15 0 0');")
open(p,'w',encoding='utf-8').write(s)
print('done')
