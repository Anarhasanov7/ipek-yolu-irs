#!/bin/bash
set -e

declare -A IMAGES
IMAGES=(
  ["01-cisv-summer-camp.jpg"]="https://upload.wikimedia.org/wikipedia/commons/b/b8/CISV_summer_camp.jpg"
  ["02-erasmus-esn.jpg"]="https://upload.wikimedia.org/wikipedia/commons/4/4c/Erasmus_ESN_Zaragoza_2016.jpg"
  ["03-university-students-portugal.jpg"]="https://upload.wikimedia.org/wikipedia/commons/3/3d/Portugal%2C_Coimbra%2C_University_Students_%2852594432408%29.jpg"
  ["04-students-learning.jpg"]="https://upload.wikimedia.org/wikipedia/commons/4/40/Students_learning_together_%28Unsplash%29.jpg"
  ["05-workcamp-schenkenzell.jpg"]="https://upload.wikimedia.org/wikipedia/commons/1/14/International_Workcamp_in_Schenkenzell.jpg"
  ["06-school-children-break.jpg"]="https://upload.wikimedia.org/wikipedia/commons/a/a5/School_children_happy_to_be_out_for_break.jpg"
  ["07-happy-kids.jpg"]="https://upload.wikimedia.org/wikipedia/commons/8/86/Happy_kids_2.jpg"
  ["08-evs-volunteer.jpg"]="https://upload.wikimedia.org/wikipedia/commons/7/72/Middelaldercentret%2C_EVS_2014.jpg"
  ["09-ymca-volunteering.jpg"]="https://upload.wikimedia.org/wikipedia/commons/8/8c/BCCYMCA_Australia.jpg"
  ["10-student-wikipedia.jpg"]="https://upload.wikimedia.org/wikipedia/commons/4/4a/University_student_working_on_a_new_Wikipedia_aticle.jpg"
)

for name in "${!IMAGES[@]}"; do
  url="${IMAGES[$name]}"
  echo "Downloading $name..."
  curl -L -o "$name" "$url"
  echo "Resizing $name..."
  ffmpeg -y -i "$name" -vf "scale=1200:675:force_original_aspect_ratio=decrease,pad=1200:675:(ow-iw)/2:(oh-ih)/2:black@0" -q:v 2 -pix_fmt yuvj420p "tmp_$name" 2>/dev/null && mv "tmp_$name" "$name" || true
done
echo "Done"
