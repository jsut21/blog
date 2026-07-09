
pydantic class를 쓰면 key 누락 문제를 해결해 줄 수 있었다..?

장점 :
키 누락을 방지(파싱이 안되면 json에서 누락. pydantic 같은 경우 None처리하거나..)


단점 :
파싱 단계가 길다.(JSON -> 파싱 오류가 많이 발생)


Tool strategy ??
class 파싱을 할 때 langchain기능을 우선해서 쓰는거고
없다면 llm 기능을 우선으로 사용하되, 그렇지 않다몬 langchain을 이용해서 파싱하는..


